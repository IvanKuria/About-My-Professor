import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfInfoButton from "../../src/react/components/ProfInfoButton.jsx";

// --- MOCKS ---
global.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://mock-id/${path}`,
  },
};

const createApiData = (overrides = {}) => ({
  cn: ["Professor Test"],
  mail: ["test@ucsc.edu"],
  telephonenumber: ["123-4567"],
  ucscpersonpubdepartmentnumber: ["Computer Science"],
  ucscpersonpubdivision: ["Engineering"],
  ucscpersonpubofficehours: ["Mon 2-4pm"],
  ucscpersonpubwebsite: ["http://example.com"],
  ucscpersonpubresearchinterest: ["Artificial Intelligence"],
  ucscpersonpubfacultycourses: ["CSE 101"],
  ucscpersonpubselectedpublication: ['<a href="http://pub.com">My Paper</a>'],
  jpegphoto: "https://example.com/photo.jpg?uid=ptest",
  ...overrides,
});

const createRmpData = (overrides = {}) => ({
  avgRatingRounded: 4.0,
  numRatings: 10,
  avgDifficultyRounded: 3.0,
  wouldTakeAgainPercentRounded: 80,
  legacyId: 12345,
  teacherRatingTags: [{ tagName: "Helpful", tagCount: 5 }],
  ...overrides,
});

describe("ProfInfoButton Component", () => {
  // =================================================================
  // Basic Identity (basic info for prof)
  // Stories: Button present, Full name (last, first), Department
  // Email + Phone Number, Prof Picture,
  // In general, the tests should have some sort of format that
  // is easily readable and more importantly, it has to be consistent.
  // =================================================================
  describe("Basic Info", () => {
    // Basic Info - User Story 1
    test("BI-US1: opens the modal when the button is clicked", () => {
      render(<ProfInfoButton apiData={createApiData()} />);

      // Click the main button
      const button = screen.getByRole("button", { name: /Professor Info/i });
      fireEvent.click(button);
      expect(screen.getByText(/About the Professor/i)).toBeInTheDocument();
    });

    test("MISC-US1-2: Closes modal on close button click", () => {
      render(<ProfInfoButton apiData={createApiData()} />);
      fireEvent.click(screen.getByRole("button", { name: /Professor Info/i }));

      const closeBtn = screen.getByLabelText("Close");
      fireEvent.click(closeBtn);

      expect(
        screen.queryByText(/About the Professor/i),
      ).not.toBeInTheDocument();
    });

    test.todo("placeholder");

    test.todo("placeholder");

    test.todo("placeholder");
  });

  // =========================================================================================
  // More Info (for the prof)
  // Stories: Office Hours, Division, Research Interests, Website, Publications, Other Courses
  // =========================================================================================
  describe("More Info", () => {
    test.todo("placeholder");

    test.todo("placeholder");

    test.todo("placeholder");

    test("MI-US3: Research Topic formats correctly", async () => {
      render(
        <ProfInfoButton
          apiData={createApiData()}
          localResearchTopic="Deep Learning"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Professor Info/i }));
      fireEvent.click(screen.getByText(/More Info/i));

      // Custom matcher for bold label
      expect(
        screen.getByText((content, element) => {
          return (
            element.tagName.toLowerCase() === "strong" &&
            content.includes("Research Topic")
          );
        }),
      ).toBeInTheDocument();

      expect(screen.getByText(/Deep Learning/i)).toBeInTheDocument();
    });

    test("MI-US4: Displays Division if different from Dept", () => {
      const data = createApiData({
        ucscpersonpubdivision: ["Engineering"],
      });
      render(<ProfInfoButton apiData={data} />);
      fireEvent.click(screen.getByRole("button", { name: /Professor Info/i }));
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    test("MI-US5: Displays Website and Publications in More Info", () => {
      render(<ProfInfoButton apiData={createApiData()} />);
      fireEvent.click(screen.getByRole("button", { name: /Professor Info/i }));
      fireEvent.click(screen.getByText(/More Info/i));

      expect(screen.getByText("example.com/")).toBeInTheDocument();
      expect(screen.getByText(/Publication 1/i)).toBeInTheDocument();
    });

    test.todo("placeholder");

    test.todo("placeholder");
  });

  // ========================================================================
  // RMP (Rate My Professor Section)
  // Stories: Star Rating, Tags, Avaliable in Shopping Cart, Stored in Cache
  // ========================================================================
  describe("More Info", () => {
    test.todo("placeholder");

    test.todo("placeholder");

    test.todo("placeholder");
  });

  // ==========================================================
  // Misc. stuff
  // Stories: Testing
  // ==========================================================
  describe("Misc", () => {
    test("MISC-US1: Does not crash with empty API data", () => {
      render(<ProfInfoButton apiData={{}} />);
      const button = screen.getByRole("button", { name: /Professor Info/i });
      fireEvent.click(button);

      // Should show fallback
      expect(screen.getByText("Not Listed")).toBeInTheDocument();
    });

    test.todo("placeholder");

    test.todo("placeholder");
  });
});
