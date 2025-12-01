/**
 * @file rmpCache.js
 * Handles all data fetching, caching, and matching for
 * Rate My Professors (RMP).
 */

import Fuse from "fuse.js";

// --- Constants ---
const RATE_MY_PROFESSORS_ENDPOINT = "https://www.ratemyprofessors.com/graphql";
const UCSC_SCHOOL_ID = "U2Nob29sLTEwNzg="; // Base64 encoded "School-1078"
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 * 7; // 1 week
let hasLoggedSuccessfulRmpConnection = false;

// GraphQL query for RateMyProfessors
const RATE_MY_PROFESSORS_QUERY = `query NewSearchTeachersQuery($text: String!, $schoolID: ID) {
  newSearch {
    teachers(query: { text: $text, schoolID: $schoolID }, first: 5) {
      didFallback
      edges {
        cursor
        node {
          id
          legacyId
          firstName
          lastName
          avgRatingRounded
          numRatings
          wouldTakeAgainPercentRounded
          wouldTakeAgainCount
          teacherRatingTags {
            id
            legacyId
            tagCount
            tagName
          }
          avgDifficultyRounded
          school {
            name
            id
          }
          department
        }
      }
    }
  }
}`;

// --- RateMyProfessors API Functions ---
/**
 * Builds the variables object for the RMP GraphQL query.
 * @param {string} name - The professor's name (e.g., "TANTALO,C")
 * @param {string} schoolId - The RMP school ID.
 * @returns {object} The variables object for the query.
 */
function buildRmpQueryVariables(name, schoolId) {
  const trimmed = name ? name.trim() : "";
  let text = trimmed;

  // Converts "Last, First" to "First Last" for better search results
  if (trimmed.includes(",")) {
    const [last, first] = trimmed.split(",").map((part) => part.trim());
    if (first && last) {
      text = `${first} ${last}`;
    }
  }

  return {
    text,
    schoolID: schoolId || UCSC_SCHOOL_ID,
  };
}

// --- RMP Data Processing Functions ---
/**
 * Creates a list of searchable "tokens" from a professor's RMP data.
 * @param {object} node - The RMP professor data node.
 * @returns {Array<string>} A list of search terms (e.g., "John Doe", "Doe, J.", "Tough Grader").
 */
function createSearchTokens(node) {
  const first = node?.firstName ? String(node.firstName).trim() : "";
  const last = node?.lastName ? String(node.lastName).trim() : "";
  const tokens = [];

  if (first || last) {
    const fullName = [first, last].filter(Boolean).join(" ");
    const reversedName = [last, first].filter(Boolean).join(", ");
    const initials = first ? `${first[0]}.` : "";

    if (fullName) tokens.push(fullName);
    if (reversedName) tokens.push(reversedName);
    if (initials && last) {
      tokens.push(`${last}, ${initials}`);
      tokens.push(`${initials} ${last}`);
    }

    // compact versions without spaces or punctuation
    const compact = (value) => value.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (fullName) tokens.push(compact(fullName));
    if (reversedName) tokens.push(compact(reversedName));
    if (initials && last) tokens.push(compact(`${last}${initials}`));
  }

  if (Array.isArray(node?.teacherRatingTags)) {
    node.teacherRatingTags.forEach((tag) => {
      if (tag?.tagName) {
        tokens.push(String(tag.tagName).trim());
      }
    });
  }

  return Array.from(new Set(tokens.filter(Boolean)));
}

/**
 * Uses Fuse.js fuzzy search to find the best RMP match for a given name.
 * @param {Array} edges - The list of professor "edges" from the RMP API.
 * @param {string} name - The name we are searching for (e.g., "TANTALO,P").
 * @returns {object|null} The best matching professor node, or null.
 */
// gets the best match by using fuzzy search - I.K
export function selectBestRmpMatch(edges, name) {
  if (!Array.isArray(edges) || edges.length === 0) return null;

  const candidates = edges
    .map((edge) => edge?.node)
    .filter(Boolean)
    .map((node) => ({
      ...node,
      searchTokens: createSearchTokens(node),
    }));

  if (candidates.length === 0) return null;
  if (!name) return candidates[0];

  const fuse = new Fuse(candidates, {
    includeScore: true,
    shouldSort: true,
    threshold: 0.35,
    keys: ["searchTokens"],
  });

  const formattedName = buildRmpQueryVariables(name)?.text || "";
  const searchTerms = [formattedName, name]
    .map((term) => term && term.trim())
    .filter(Boolean);

  const normalizeForFallback = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");

  for (const term of searchTerms) {
    const results = fuse.search(term);
    if (results.length > 0) {
      const [best] = results;
      if (best?.item) {
        return best.item;
      }
    }
  }

  // fallback to direct normalized comparison
  const target = normalizeForFallback(searchTerms[0] || name);
  const fallbackMatch = candidates.find((candidate) => {
    const comparisonValues = (candidate.searchTokens || []).map((token) =>
      normalizeForFallback(token),
    );
    return comparisonValues.includes(target);
  });
  if (fallbackMatch) return fallbackMatch;

  return candidates[0];
}

/**
 * A cached wrapper for the RateMyProfessors API.
 * Fetches rmp data given a prof name and the school id - I.K
 * @param {string} uID - The professor's User ID (used for the cache key).
 * @param {string} name - The professor's name (e.g., "TANTALO,P").
 * @param {string} schoolId - The RMP school ID.
 * @returns {Promise<Array|null>} A list of matching professor "edges" or null.
 */
export async function fetchRateMyProfessorData(name, schoolId) {
  if (!name) return null;

  const variables = buildRmpQueryVariables(name, schoolId);
  const response = await fetch(RATE_MY_PROFESSORS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Basic dGVzdDp0ZXN0", // "test:test"
    },
    body: JSON.stringify({
      query: RATE_MY_PROFESSORS_QUERY,
      variables,
    }),
  });

  if (!hasLoggedSuccessfulRmpConnection && response.ok) {
    console.log("RateMyProfessors GraphQL connection successful");
    hasLoggedSuccessfulRmpConnection = true;
  }

  if (!response.ok) {
    throw new Error(
      `RateMyProfessors request failed with status ${response.status}`,
    );
  }

  const payload = await response.json();
  if (payload?.errors?.length) {
    console.error(
      "RateMyProfessors GraphQL errors:",
      payload.errors.map((err) => err.message).join(", "),
    );
    return null;
  }

  return payload?.data?.newSearch?.teachers?.edges ?? null;
}

/**
 * A cached wrapper for the RateMyProfessors API.
 * Checks local storage for fresh data before fetching.
 * @param {string} uID - The professor's User ID (used for the cache key).
 * @param {string} name - The professor's name (e.g., "TANTALO,C").
 * @param {string} schoolId - The RMP school ID.
 * @returns {Promise<Array|null>} A list of matching professor "edges" or null.
 */
export async function fetchCachedRateMyProfessorData(uID, name, schoolId) {
  if (!uID) {
    return null;
  }

  // use the uID for the storage key
  const storageKey = `rmp_${uID}`;

  try {
    const cache = await chrome.storage.local.get([storageKey]);
    const cachedEntry = cache[storageKey];
    const now = Date.now();

    // check cache
    if (cachedEntry && now - cachedEntry.timestamp < CACHE_DURATION_MS) {
      console.log(`[CACHE HIT] Using cached RMP data for ${uID} (${name})`);
      return cachedEntry.data;
    }

    // fetch new data
    console.log(`[CACHE MISS] Fetching new RMP data for ${uID} (${name})`);
    // The raw fetch still uses the 'name'
    const apiResponse = await fetchRateMyProfessorData(name, schoolId);

    // save to cache
    await chrome.storage.local.set({
      [storageKey]: {
        data: apiResponse, // This will be the array of edges, or null
        timestamp: Date.now(),
      },
    });

    return apiResponse;
  } catch (error) {
    console.error(`Failed to fetch RMP data for ${name}`, error);
    await chrome.storage.local.remove(storageKey).catch(() => {});
    return null; // Return null on failure
  }
}
