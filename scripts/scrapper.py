from selenium import webdriver
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import urllib.parse
import time
import json
import re

from research_scraper import scrape_research_topics

TIMEOUT = 2
JSON_FILE = "prof_names.json"

opts = webdriver.ChromeOptions()
opts.add_experimental_option("detach", True)
# Run in HEADFUL (visible) mode for debugging (comment out the --headless=new arg)
# otherwise, headless is optimal
opts.add_argument("--headless=new") 
# print("WebDriver is running in HEADFUL (visible) mode for debugging.")

opts.add_argument("--window-size=1920,1080")
user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
opts.add_argument(f'user-agent={user_agent}')
opts.add_experimental_option("excludeSwitches", ["enable-automation"])
opts.add_argument('--disable-blink-features=AutomationControlled')

driver = webdriver.Chrome(options=opts)
driver.get("https://pisa.ucsc.edu/cs9/prd/sr9_2013/index.php?action=search&strm=2258")

# ---------- Helper Functions for Caching ----------
def load_seen_professors(file_path: str) -> dict:
    """
    Loads the existing professor JSON file, or returns an empty dict.
    This populates our 'seen' cache.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Loaded {len(data)} entries from {file_path}")
            return data
    except FileNotFoundError:
        print("No existing JSON file found. Starting fresh.")
        return {}
    except json.JSONDecodeError:
        print(f"Error reading {file_path}. Starting fresh.")
        return {}

def is_valid_prof_link(link: str) -> bool:
    """
    Checks if a link is a valid, specific professor profile page.
    A valid link must contain "?uid=" or "cd_detail".
    """
    if not isinstance(link, str):
        return False
    # Check for specific patterns
    return "?uid=" in link or "cd_detail" in link



# --- Scraping Helper Functions --- 
def smart_find(xpath: str, timeout: int = TIMEOUT):
    """
    Waits for an element to be visible and returns it.
    """
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.XPATH, xpath))
    )

def smart_click(xpath: str, timeout: int = TIMEOUT):
    """
    Waits for an element to be clickable and clicks it.
    """
    el = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.XPATH, xpath))
    )
    el.click()

def smart_select_dropdown_value(xpath: str, visible_text: str, timeout: int = TIMEOUT):
    """
    Waits for a dropdown element and selects an option by its visible text.
    """
    el = WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.XPATH, xpath))
    )
    Select(el).select_by_visible_text(visible_text)

# ---------- DuckDuckGo stuff ----------
def duck_search(query: str) -> str | None:
    """
    Searches DuckDuckGo and checks the top 3 results for a 
    UCSC campus directory link.
    """
    encoded = urllib.parse.quote_plus(query)
    url = f"https://duckduckgo.com/?q={encoded}&ia=web"
    found_link = None

    # Open new tab and switch
    driver.execute_script("window.open('about:blank','_blank');")
    driver.switch_to.window(driver.window_handles[-1])
    
    try:
        driver.get(url)

        # Wait for the first result link to be present
        WebDriverWait(driver, TIMEOUT).until(
            EC.presence_of_element_located((By.XPATH, '//*[@id="r1-0"]/div[3]/h2/a'))
        ).get_attribute("href")
        
        # Get a list of all result link elements
        result_links = driver.find_elements(By.XPATH, '//a[@data-testid="result-title-a"]')

        # Loop through the first 5 links
        for link_element in result_links[:5]:
            href = link_element.get_attribute("href")
            # A valid link must contain 'cd_detail' or '?uid='
            if href and "campusdirectory.ucsc.edu" in href and ("cd_detail" in href or "?uid=" in href):
                found_link = href
                break # Stop looping once we find it

    except Exception as e:
        print(f" DDG ERROR: {e}")
    finally:
        # Clean up
        driver.close()
        driver.switch_to.window(driver.window_handles[0])

    if not found_link:
        print(f" DDG MISS - No valid directory link in top 5 for: {query}")

    return found_link


# ---------- Main scrape stuff ----------
def get_professor_name_and_link():
    """
    Finds all class panels on the current page, scrapes instructor names,
    checks against the 'seen' cache, and fetches new links via DuckDuckGo
    only for new or invalid entries.
    """

    # use the global "seen" dict
    global seen

    try:
        # Find all class panels on the page
        panels = driver.find_elements(By.XPATH, "//div[starts-with(@id, 'rowpanel_')]")
        
        if not panels:
            print("No class panels found on this page.")
            return

        print(f"--- Found {len(panels)} class panels to check ---")

        # Regex to find "Instructor(s):" (case-insensitive)
        instructor_regex = re.compile(r"Instructor[s]?:\s*([\w,.'-]+)", re.IGNORECASE)

        # Loop through each panel element we found
        for panel in panels:
            try:
                panel_text = panel.text
                prof_names = instructor_regex.findall(panel_text)

                if not prof_names:
                    continue

                for prof_abbrev in prof_names:
                    prof_abbrev = prof_abbrev.strip()
                    
                    if not prof_abbrev or prof_abbrev.lower() == "staff":
                        continue
                    
                    # Check cache
                    if prof_abbrev in seen:
                        existing_link = seen[prof_abbrev]
                        if is_valid_prof_link(existing_link):
                            print(f"CACHE HIT - Skipping {prof_abbrev} (valid link exists)")
                            continue
                        else:
                            print(f"CACHE STALE - Re-searching for {prof_abbrev} (link was: {existing_link})")
                    else:
                        print(f"CACHE MISS - New professor. Searching for {prof_abbrev}...")
                    
                    query = prof_abbrev.replace(",", " ") + " ucsc campus directory"
                    campus_link = duck_search(query)

                    seen[prof_abbrev] = campus_link 
                    print(f"RESOLVED - {prof_abbrev} -> {campus_link}")

            except Exception as e:
                print(f"ERROR - An unexpected error occurred while processing a panel: {e}")
                continue
                
    except Exception as e:
        print(f"Error finding class panels: {e}")


# ---------- Run ----------
def scrape_class_professors(driver, seen_cache):
    """
    Runs the Selenium-based scraper for the PISA class search
    to find professor-to-link mappings.
    """
    print("\n--- Starting Class Professor Scrape ---")
    smart_select_dropdown_value('//*[@id="reg_status"]', "All Classes")
    smart_click('//*[@id="searchForm"]/div/div[2]/div[17]/div/input')
    smart_select_dropdown_value('//*[@id="rec_dur"]', '100')

    for i in range(15): # Loop 15 times for 15 pages
        print(f"\n--- Scraping Page {i+1} ---")
        get_professor_name_and_link() # This function still uses the global 'seen'
        time.sleep(0.5)
        try:
            driver.find_element(By.LINK_TEXT, "next").click()
            time.sleep(1.5) # Wait for page to load
        except NoSuchElementException:
            print("No more 'next' pages. Ending class scrape.")
            break
            
    # Save the class professor data
    with open("prof_names.json", "w", encoding="utf-8") as f:
        json.dump(seen_cache, f, ensure_ascii=False, indent=2)

    print(f"\nScrape complete. Saved {len(seen_cache)} total entries to {JSON_FILE}")


# --- Main entry point ---
if __name__ == "__main__":
    seen = load_seen_professors("prof_names.json")
    # --- Task 1: Scrape Research Topics ---
    try:
        scrape_research_topics() 
    except Exception as e:
        print(f"An error occurred during the class professor scrape: {e}")
    finally:
        # Always close the browser when done
        driver.quit()
        print("\nBrowser closed.")
    
    
    # --- Task 2: Scrape Class Professors ---
    try:
        scrape_class_professors(driver, seen)
    except Exception as e:
        print(f"An error occurred during the class professor scrape: {e}")
    finally:
        # Always close the browser when done
        driver.quit()
        print("\nBrowser closed.")

    print("\nAll scraping tasks complete.")