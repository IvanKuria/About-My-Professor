/**
 * @file ampCache.js
 * Handles all data fetching and caching for the
 * UCSC Campus Directory (Academic/AMP).
 */

// --- Constants ---
const CAMPUS_DIRECTORY_BASE_URL = "https://campusdirectory.ucsc.edu/api/uid/";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 * 7; // 1 week

/**
 * Fetches profile data directly from the campus directory API.
 * This function does NOT use the cache.
 * @param {string} uID - The professor's User ID (e.g., "pdey")
 * @returns {Promise<object>} The raw data from the API.
 */
async function fetchProfileFromAPI(uID) {
  const response = await fetch(`${CAMPUS_DIRECTORY_BASE_URL}${uID}`);

  if (!response.ok) {
    throw new Error(
      `Campus directory request failed with status ${response.status}`,
    );
  }

  const data = await response.json();
  if (!data) {
    throw new Error("Campus directory returned empty payload");
  }

  return data;
}

/**
 * A cached wrapper for the campus directory API.
 * Checks local storage for fresh data before fetching.
 * @param {string} uID - The professor's User ID (e.g., "pdey")
 * @returns {Promise<object>} A response object, e.g., { data: {...}, success: true }
 */
export async function fetchCachedCampusDirectoryProfile(uID) {
  if (!uID) {
    return { data: null, success: false };
  }

  const storageKey = `amp_${uID}`;
  try {
    const cache = await chrome.storage.local.get([storageKey]);
    const cachedEntry = cache[storageKey];
    const now = Date.now();

    // check the cache
    if (cachedEntry && now - cachedEntry.timestamp < CACHE_DURATION_MS) {
      console.log(`[CACHE HIT] Using cached data for ${uID}`);
      return cachedEntry.data;
    }

    // CACHE MISS: Fetch new data
    console.log(`[CACHE MISS] Fetching new data for ${uID}`);
    const apiData = await fetchProfileFromAPI(uID);

    // wrap the raw data in our standard response format
    const apiResponse = { data: apiData, success: true };

    // save to cache
    await chrome.storage.local.set({
      [storageKey]: {
        data: apiResponse, // Save the full, correct response object
        timestamp: Date.now(),
      },
    });

    return apiResponse;
  } catch (error) {
    console.error(
      `Failed to fetch campus directory profile for ${uID}:`,
      error.message,
    );
    await chrome.storage.local.remove(storageKey).catch(() => {});
    return { data: null, success: false };
  }
}
