/**
 * @file jest.config.js
 * @description Configuration file for the Jest testing framework.
 * * Settings:
 * - testEnvironment: 'jsdom' (Required for testing React components).
 * - moduleNameMapper: Mocks static assets (CSS, Images) so Node.js doesn't crash when importing them.
 * - testPathIgnorePatterns: Excludes the `tests/e2e` folder so Jest doesn't try to run Playwright tests.
 * - roots: Explicitly points Jest to the `tests/unit` directory for efficiency.
 */

export default {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js", // Mock CSS imports
    "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js", // Mock Image imports
  },
  transform: {
    // Process js/jsx files with babel-jest
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  // This tells Jest to transform files in node_modules if needed, but usually ignore them
  transformIgnorePatterns: ["/node_modules/", "\\.pnp\\.[^\\/]+$"],
  // Explicitly tell Jest to only look here
  roots: ["<rootDir>/tests/unit"],
  testPathIgnorePatterns: ["/node_modules/", "/tests/e2e"], // Ignore E2E folder
};
