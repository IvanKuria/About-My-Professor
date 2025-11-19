import json
import requests
from bs4 import BeautifulSoup 

JSON_FILE = "prof_research_topics.json"

def load_research_cache():
    """
    Loads the research topics file from disk.
    Returns a dict of the cached data, or an empty dict if the file doesn't exist
    """
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Loaded {len(data)} cached entries from {JSON_FILE}")
            return data
    except (FileNotFoundError, json.JSONDecodeError):
        print(f"Cache file '{JSON_FILE}' not found or is invalid. A new one will be created.")
        return {}
    

def scrape_research_topics():
    """
    Scrapes the UCSC Science faculty directory by fetching the raw HTML
    and parsing the 'div.card-container' cards.
    This function now compares the scraped data to the cache and only
    writes to the file if new or changed data is found.
    """
    URL = "https://science.ucsc.edu/directory/faculty-researchers/"
    cached_data = load_research_cache()
    freshly_scraped_data = {}
    
    print(f"\n--- Starting Research Topic Scrape (HTML Parse Method) ---")
    print(f"Fetching data from {URL}...")
    
    try:
        # Fetch the page content (no browser needed, but requires a user agent)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(URL, timeout=10, headers=headers)
        response.raise_for_status() # Check for errors

        # Parse the HTML with BeautifulSoup
        print("Parsing HTML response...")
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all professor entries
        professor_entries = soup.find_all('div', class_='card-container')
        
        if not professor_entries:
            print("Error: Could not find any 'card-container' divs.")
            print("This may be due to a change in the page structure.")
            return

        print(f"Found {len(professor_entries)} professor entries.")

        # Loop through each entry and extract the data
        for entry in professor_entries:
            try:
                # Find the 'h3' (name) and 'div.card-blurb' (topic)
                name_tag = entry.find('h3')
                # The topic is in a <div> with class 'card-blurb'
                topic_tag = entry.find('div', class_='card-blurb')
                
                if name_tag and topic_tag:
                    name = name_tag.text.strip()
                    topic = topic_tag.text.strip()
                    
                    # Sometimes the card-blurb is empty, so we check
                    if name and topic:
                        freshly_scraped_data[name] = topic
            except Exception as e:
                print(f"WARN - Skipping an entry, error parsing: {e}")
        
        # Compare the newly scraped data to the old cached data
        if freshly_scraped_data == cached_data:
            print(f"Scrape complete. No changes detected.")
            print(f"Found {len(freshly_scraped_data)} entries (same as cache).")
        else:
            print(f"Scrape complete. New data found!")
            # Save the new data to the JSON file
            with open(JSON_FILE, "w", encoding="utf-8") as f:
                json.dump(freshly_scraped_data, f, ensure_ascii=False, indent=2)
                
            print(f"Successfully saved {len(freshly_scraped_data)} research topics to {JSON_FILE}")

    except requests.exceptions.RequestException as e:
        print(f"Error during request: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")