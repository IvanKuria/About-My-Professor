/**
 * @file utils.test.js
 * @description Unit tests for pure JavaScript utility functions to validate helper logic used across the extension, ensuring robust data handling before it reaches the UI.
 * Tests:
 * `getFirst()`: Verifies correct handling of arrays vs. strings vs. null/undefined inputs.
 */

import { getFirst } from "../../src/utils/utils";

describe("Utility Functions", () => {
  describe("getFirst()", () => {
    test("should return the string itself if input is a string", () => {
      expect(getFirst("Hello")).toBe("Hello");
    });

    test("should return the first element if input is an array", () => {
      expect(getFirst(["John", "Doe"])).toBe("John");
    });

    test("should return the single element if input is an array of length 1", () => {
      expect(getFirst(["World"])).toBe("World");
    });

    test("should return null/undefined for empty arrays", () => {
      const result = getFirst([]);
      // should be null
      expect(result).toBeFalsy();
    });

    test("should return null/undefined for null/undefined input", () => {
      expect(getFirst(null)).toBeFalsy();
      expect(getFirst(undefined)).toBeFalsy();
    });
  });
});
