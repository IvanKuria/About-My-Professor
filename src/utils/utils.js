/**
 * @file utils.js
 * Contains shared helper functions used across multiple modules.
 */

/**
 * Safely extracts and cleans the first string value from an array or string.
 * This handles the inconsistent array/string format returned by the campus directory API.
 * @param {*} value - The value to parse (e.g., [" Jon Doe "] or " Jon Doe ")
 * @returns {string|null} The trimmed string or null if the value is invalid or empty.
 */
export const getFirst = (value) => {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "string"
  ) {
    // If it's an array, return the trimmed first element
    return value[0].trim() || null;
  }
  if (typeof value === "string") {
    // If it's a string, return the trimmed value
    return value.trim() || null;
  }
  return null;
};
