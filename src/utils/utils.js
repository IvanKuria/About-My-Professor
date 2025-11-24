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

/**
 * A new component to render a 5-star rating.
 * @param {object} props - Component props.
 * @param {number} props.rating - The rating number (0-5).
 * @param {number} props.numRatings - The total number of ratings.
 */
export function StarRating({ rating, numRatings }) {
  // If rating is null or there are no ratings, display "N/A"
  if (rating == null || numRatings === 0) {
    return <span className="metric-value">N/A</span>;
  }

  return (
    <div className="star-rating">
      {[...Array(5)].map((_, index) => (
        <svg
          key={index}
          className={index < rating ? "star-filled" : "star-empty"}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 17.27L18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21 12 17.27z" />
        </svg>
      ))}
    </div>
  );
}
