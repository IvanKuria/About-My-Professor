import json
import re

# --- Constants ---
SOURCE_FILE = 'prof_names.json'
DESTINATION_FILE = 'prof_uid.json'

# --- Helper Functions ---

def load_json(file_path):
    """Safely loads data from a JSON file, returning an empty dict on failure."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        print(f"[WARN] File {file_path} is corrupted. Starting fresh for this file.")
        return {}

def extract_uid(link: str) -> str | None:
    """
    Extracts the User ID (UID) from a directory link using regex.
    Returns None if the link is invalid or the UID cannot be found.
    """
    if not isinstance(link, str):
        return None
    # Look for "uid=" followed by one or more "word" characters (letters, numbers, hyphen)
    match = re.search(r"uid=([\w-]+)", link)
    return match.group(1) if match else None

# --- Main Logic ---

def update_prof_uid_mapping():
    """
    Loads existing UID mappings, iterates through the new links, and
    replaces/adds entries ONLY if the UID is missing or the link is bad.
    """
    # Load existing clean UID mapping (our priority file)
    existing_uids = load_json(DESTINATION_FILE)
    
    # Load the new, messy links from the scraper output
    new_links = load_json(SOURCE_FILE)
    
    updates_made = 0
    total_processed = 0

    print(f"--- Starting UID Consolidation ---")
    print(f"Loaded {len(existing_uids)} existing UIDs from {DESTINATION_FILE}")

    # Process each Name -> Link entry from the scraper output
    for name, link in new_links.items():
        total_processed += 1
        
        # 1. Safely extract the UID from the link
        new_uid = extract_uid(link)
        
        # 2. Check if this professor (by name) is ALREADY in the final map
        if name in existing_uids:
            # We assume the UID in the destination file is CORRECT and do not overwrite it.
            continue
        
        # 3. Check if we found a VALID UID in the new link
        if new_uid:
            # Add the NEW mapping to the dictionary
            existing_uids[name] = new_uid
            updates_made += 1
            print(f"[ADDED] {name} -> {new_uid} (New valid UID found)")
        else:
            # If the link was bad or None, we skip it and don't save the bad link.
            pass

    # --- Write the new, consolidated file ---
    try:
        with open(DESTINATION_FILE, "w", encoding='utf-8') as file:
            json.dump(existing_uids, file, indent=4, ensure_ascii=False)
        
        print("\n--- Consolidation Complete ---")
        print(f"Total entries processed from {SOURCE_FILE}: {total_processed}")
        print(f"Total UIDs added/updated: {updates_made}")
        print(f"Final total entries in {DESTINATION_FILE}: {len(existing_uids)}")

    except Exception as e:
        print(f"An error occurred while writing the file: {e}")

# Run the update process
if __name__ == "__main__":
    update_prof_uid_mapping()
            