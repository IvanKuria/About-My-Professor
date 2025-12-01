import json
import re
import requests
from bs4 import BeautifulSoup 
from collections import defaultdict


JSON_FILE = "prof_classes.json"

def load_classes_taught_cache():
    """
    Loads the classes taught file from disk.
    Returns a dict of the cached data, or an empty dict if the file doesn't exist B.C.
    """
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Loaded {len(data)} cached entries from {JSON_FILE}")
            return data
    except (FileNotFoundError, json.JSONDecodeError):
        print(f"Cache file '{JSON_FILE}' not found or is invalid. A new one will be created.")
        return {}
    

def scrape_classes_taught():
    """
    Scrapes classes paired with listed professors that teach them by fetching the raw HTML
    and parsing the elements. This function still needs to implement comparing the scraped data to the cache
    and only writes to the json if new data is found.
    Could also scrape all links in the catalog & older catalogs if had more time - B.C.
    """
    baseURL = "https://catalog.ucsc.edu/en/current/general-catalog/courses/"
    baseEngineeringURL = "https://courses.engineering.ucsc.edu/courses/"
    baseEngineeringURLEndings = ["/2025","/2024","/2023","/2022"]
    EngineeringURLExtensions = ["am","bme", "cmpm", "cse", "ece", "game", "hci", "nlp", "stat", "tim"]
    #only include some becuase many don't have any instructor info or only have "The Staff" listed - B.C.
    URLExtensions = ["anth-anthropology", "aplx-applied-linguistics", "arbc-arabic", "art-art",
                      "artg-art-and-design-games-and-playable-media", "bioc-biochemistry-and-molecular-biology", 
                      "bioe-biology-ecology-and-evolutionary", "biol-biology-molecular-cell-and-developmental", 
                      "bme-biomolecular-engineering", "chin-chinese", "cmmu-community-studies", "cowl-cowell-college",
                      "cres-critical-race-and-ethnic-studies", "ct-creative-technologies", "crwn-crown-college",
                      "csp-coastal-science-and-policy", "educ-education", "envs-environmental-studies", "film-film-and-digital-media",
                      "fmst-feminist-studies", "fren-french", "gch-global-community-health", "grad-graduate", 
                      "havc-history-of-art-and-visual-culture", "hebr-hebrew", "hisc-history-of-consciousness",
                      "his-history", "humn-humanities", "ital-italian", "japn-japanese", "jrlc-john-r-lewis-college",
                      "krsg-kresge-college", "lals-latin-american-and-latino-studies", "lgst-legal-studies",
                      "ling-linguistics", "lit-literature", "metx-microbiology-and-environmental-toxicology",
                      "mse-materials-science-and-engineering", "musc-music", "oaks-oakes-college", "pbs-physical-biological-sciences",
                      "phye-physical-education", "poli-politics", "prtr-porter-college", "punj-punjabi", "scic-science-communication",
                      "socd-social-documentation", "socy-sociology", "span-spanish", "sphs-spanish-for-heritage-speakers",
                      "stev-stevenson-college", "ucdc-ucdc", "vast-visualizing-abolition-studies", "writ-writing"]
    freshly_scraped_data = defaultdict(list)
    cached_data = load_classes_taught_cache()

    print(f"\n--- Starting Class Scrape (HTML Parse Method) ---")

    
    #scrape from current catalog links
    for urlExtension in URLExtensions:
        URL = baseURL+urlExtension
       
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

            #All of the courses are under one big div
            # so will jump straight to the instructor div
            # and then back track to get the associated course name - B.C.
            instructorLists = soup.find_all('div', class_='instructor')

            if not instructorLists:
                print("Error: Could not find any 'instructor' divs.")
                print("This may be due to a change in the page structure.")
                return
            
            for instructors in instructorLists:
                try:
                    #use find previous sibling to get to the course name Element which is always 5 elements prior - B.C.
                    previousSibling1 = instructors.find_previous_sibling()
                    previousSibling2 = previousSibling1.find_previous_sibling()
                    previousSibling3 = previousSibling2.find_previous_sibling()
                    previousSibling4 = previousSibling3.find_previous_sibling()
                    courseNameElement = previousSibling4.find_previous_sibling()
                    

                    #parse instructors
                    innerText_tag = instructors.find('p')
                    innerText = innerText_tag.text.strip()
                    instructorList = []
                    rePattern =  r"[A-Za-z]+(?:[-\s][A-Za-z]+)*"
                    iListStr = re.findall(rePattern, innerText)
                    for potentialInstructor in iListStr:
                        if potentialInstructor != "The Staff" and potentialInstructor != "Instructor" and potentialInstructor != "Staff":
                            instructorList.append(potentialInstructor)
                    
                    #added for unit test
                    #print(f"instructors found: {instructorList} from {innerText}")

                    #check if got correct course name element then add them to the new dict of lists
                    if 'course-name' in courseNameElement['class']:
                        courseName = courseNameElement.text.strip()
                        for instructor in instructorList:
                            freshly_scraped_data[instructor].append(courseName) 
                    else:
                        previousSibling6 = courseNameElement.find_previous_sibling()
                        courseNameElementSomtimes = previousSibling6.find_previous_sibling()
                        courseNameElementRarely = courseNameElementSomtimes.find_previous_sibling()
                        if 'course-name' in courseNameElementSomtimes['class']:
                            courseName = courseNameElementSomtimes.text.strip()
                            for instructor in instructorList:
                                freshly_scraped_data[instructor].append(courseName)
                        elif 'course-name' in courseNameElementRarely['class']:
                            courseName = courseNameElementRarely.text.strip()
                            for instructor in instructorList:
                                freshly_scraped_data[instructor].append(courseName)
                        
                        else:
                            raise ValueError("didn't find course name element as the 5th previous sibling")
                    
                except ValueError as e:
                    print(e)    
                except Exception as e:
                    print(f"WARNING - Skipping an entry, error parsing: {e}")

        except requests.exceptions.RequestException as e:
            print(f"Error during request: {e}")
        except Exception as e:
            print(f"An error occurred: {e}")

    #also scrape Engineering website links
    for ending in baseEngineeringURLEndings:
        for extension in EngineeringURLExtensions:
            URL = baseEngineeringURL + extension + ending
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

                #All of the courses are under one big div
                # so will jump straight to the class div
                # and then will nagivate using siblings to get the associated course staff names - B.C.
                courseElementList = soup.find_all('td', class_='soe-classes-schedule-course-name')

                if not courseElementList:
                    print("Error: Could not find any soe-classes-schedule-course-name divs.")
                    print("This may be due to a change in the page structure.")
                    return

                for courseElement in courseElementList:
                    try:
                        courseElementContainer = courseElement.find_parent()
                        instructorsByQuarterContainer = courseElementContainer.find_next_sibling()
                        count = 0
                        courseName = courseElement.text.strip()
                        for instructorsByQuarter in instructorsByQuarterContainer.findChildren(recursive=False):
                            #only check first four children
                            count += 1
                            #parse instructors and remove uid
                            innerText = instructorsByQuarter.text.strip()
                            #print(f"text: {innerText}")
                            textWOutUIDs = re.sub(r'\(.*?\)', '', innerText)
                            instructorList = []
                            rePattern =  r"[A-Za-z]+(?:[-\s][A-Za-z]+)*"
                            iListStr = re.findall(rePattern, textWOutUIDs)
                            badStrings = ['Section','Session', 'In Person', 'Staff', "In-person", "In person", "Week", "Online", "online", "G", "n", "A", "Weeks", "S", "L"]
                            for potentialInstructor in iListStr:
                                if(potentialInstructor not in badStrings ):
                                    instructorList.append(potentialInstructor)
                            #print(f"instructors: {instructorList}")
                            if count >= 4:
                                break    
                        
                            
                            if(instructorList.__len__ != 0):
                                for instructor in instructorList:
                                    freshly_scraped_data[instructor].append(courseName)

                    except Exception as e:
                        print(f"WARNING - Skipping an entry, error parsing: {e}")


            except requests.exceptions.RequestException as e:
                print(f"Error during request: {e}")
            except Exception as e:
                print(f"An error occurred: {e}")            
        


    #combine new data with cached data and remove duplicates
    merged_dict = {}
    freshly_scraped_data = dict(freshly_scraped_data)
    # Combine keys and values from both dictionaries, using sets to remove duplicates
    all_keys = set(freshly_scraped_data.keys()) | set(cached_data.keys()) # Use set union to get all unique keys

    for key in all_keys:
        # Get values for the current key, defaulting to an empty list if the key is missing
        list1_values = freshly_scraped_data.get(key, [])
        list2_values = cached_data.get(key, [])

        # Combine the lists and convert to a set to remove duplicates, then back to a list
        unique_values = list(set(list1_values + list2_values))
        
        merged_dict[key] = unique_values

    # Compare the newly scraped data to the old cached data
    if merged_dict == cached_data:
        print(f"Scrape complete. No changes detected.")
        print(f"Found {len(merged_dict)} entries (same as cache).")
    else:
        print(f"Scrape complete. New data found!")
        # Save the new data to the JSON file
        with open(JSON_FILE, "w", encoding="utf-8") as f:
            json.dump(merged_dict, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully saved {len(merged_dict)} teachers with classes taught to {JSON_FILE}")

    
    