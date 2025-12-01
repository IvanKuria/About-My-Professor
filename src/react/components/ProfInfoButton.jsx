import React, { useState, useEffect, useCallback } from "react";
import "../styles/index.css";
import {
  getFirst,
  toNumber,
  roundToWhole,
  roundToOneDecimal,
  formatNumber,
  StarRating,
} from "../../utils/utils";

export default function ProfInfoButton(props) {
  // Track whether popup is open or closed
  const [isOpen, setIsOpen] = useState(false);
  const [isPhoto, setIsPhoto] = useState("");
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  const localResearchTopic = props.localResearchTopic;
  const localClassesTaught = props.localClassesTaught;
  

  // rate my professor data - I.K
  const rateMyProfessor = props.rateMyProfessor;
  const rating = rateMyProfessor?.avgRatingRounded;
  const numRatings = rateMyProfessor?.numRatings;
  const wouldTakeAgain = rateMyProfessor?.wouldTakeAgainPercentRounded;
  const avgDifficulty = rateMyProfessor?.avgDifficultyRounded;
  const legacyId = rateMyProfessor?.legacyId;
  const profileUrl = legacyId
    ? `https://www.ratemyprofessors.com/professor/${legacyId}`
    : null;
  const ratingTags = Array.isArray(rateMyProfessor?.teacherRatingTags)
    ? rateMyProfessor.teacherRatingTags.filter((tag) => tag?.tagName)
    : [];
  const topTags = ratingTags.slice(0, 4);

  const roundedRating = roundToWhole(rating);
  const roundedDifficulty = roundToOneDecimal(avgDifficulty);
  const roundedWouldTakeAgain = roundToWhole(wouldTakeAgain);

  // --- Process Campus Directory Data ---
  const name = getFirst(props.apiData?.cn) || "Not Listed";
  const email = getFirst(props.apiData?.mail);
  const phone = getFirst(props.apiData?.telephonenumber);
  const department = getFirst(props.apiData?.ucscpersonpubdepartmentnumber);
  const divisionValue = getFirst(props.apiData?.ucscpersonpubdivision);
  const officeHours = getFirst(props.apiData?.ucscpersonpubofficehours);
  const researchTopicText = localResearchTopic;
  const researchInterest = getFirst(
    props.apiData?.ucscpersonpubresearchinterest,
  );
  const courses = localClassesTaught || props.apiData?.ucscpersonpubfacultycourses; // assumes this is already an array

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  // Logic to only show division if it's different from the department
  const showDivision =
    divisionValue &&
    department &&
    normalize(divisionValue) !== normalize(department);

  // Shorten long URLs for display
  const formatLinkLabel = (url) => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace("www.", ""); // remove www.
      let path = u.pathname;
      // shorten long paths
      if (path.length > 20) {
        path = path.slice(0, 20) + "...";
      }
      return `${host}${path}`;
    } catch {
      return "Link"; // fallback
    }
  };

  // Extract website URL (ucscpersonpubwebsite)
  let website = null;
  const websiteField = props.apiData?.ucscpersonpubwebsite;
  if (Array.isArray(websiteField) && websiteField.length > 0) {
    const raw = websiteField[0];
    if (typeof raw === "string" && raw.trim()) {
      // value looks like: "https://leaper.sites.ucsc.edu/ Campbell Leaper Web Page"
      website = raw.split(" ")[0].trim();
    }
  } else if (typeof websiteField === "string" && websiteField.trim()) {
    website = websiteField.split(" ")[0].trim();
  }

  // Extract publication links (from ucscpersonpubselectedpublication HTML)
  let publicationLinks = [];
  const publicationsField = props.apiData?.ucscpersonpubselectedpublication;
  const extractLinksFromHtml = (html) => {
    if (typeof html !== "string" || !html.trim()) return [];
    const links = [];
    const regex = /href="([^"]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      links.push(match[1]);
    }
    return links;
  };

  if (Array.isArray(publicationsField) && publicationsField.length > 0) {
    publicationLinks = extractLinksFromHtml(publicationsField[0]);
  } else if (typeof publicationsField === "string") {
    publicationLinks = extractLinksFromHtml(publicationsField);
  }
  // Remove duplicates, just in case
  publicationLinks = Array.from(new Set(publicationLinks));

  // Logic to determine if the "More Info" button should even exist - E.H
  // the field either has to have a valid type or null
  const contactItems = [
    email && { label: "Email", value: email, href: `mailto:${email}` },
    phone && { label: "Phone", value: phone, href: `tel:${phone}` },
  ].filter(Boolean);

  const detailItems = [
    website && {
      label: "Website",
      value: formatLinkLabel(website),
      href: website,
    },
    ...publicationLinks.map((link, i) => ({
      label: `Publication ${i + 1}`,
      value: formatLinkLabel(link),
      href: link,
    })),
  ].filter(Boolean);

  const hasMoreInfo =
    Boolean(officeHours) ||
    (Array.isArray(courses) && courses.length > 0) ||
    Boolean(researchTopicText) || // Use the main topic text
    Boolean(researchInterest) || // Check for the keyword field
    Boolean(website) ||
    publicationLinks.length > 0;

  /**
   * handles photos that are valid and invalid - I.K
   * Wrapped in useCallback to stabilize it for the useEffect hook.
   * https://stackoverflow.com/questions/71265042/what-is-usecallback-in-react-and-when-to-use-it  - E.H
   */
  const handlePhotoURL = useCallback(() => {
    if (props.apiData) {
      const photoURL = props.apiData.jpegphoto;
      if (photoURL && photoURL.includes("uid")) {
        setIsPhoto(photoURL);
      } else {
        setIsPhoto("");
      }
    } else {
      setIsPhoto("");
    }
  }, [props.apiData]); // This function now only changes if apiData changes

  /**
   * Handles opening and closing of pop up - I.K
   * Also resets the "Show More" toggle when closing.  - E.H
   */
  function handleOpen() {
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setShowMoreInfo(false);
    }
  }

  /**
   * Toggles the "More Info" collapsible section.
   */
  function handleToggleMoreInfo(e) {
    // Stop the click from closing the whole modal
    // if the button is ever inside the click overlay  - E.H
    e.stopPropagation();
    setShowMoreInfo((prev) => !prev);
  }

  /**
   * Effect hook to load the professor's photo only when the modal is opened and we have data.  - E.H
   */
  useEffect(() => {
    if (isOpen) {
      handlePhotoURL();
    }
  }, [isOpen, handlePhotoURL]); // Runs when 'isOpen' or 'handlePhotoURL' changes

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      setIsOpen(false);
      setShowMoreInfo(false); // also reset on overlay click
    }
  }

  // This component won't render anything if it doesn't get apiData
  if (!props.apiData) {
    return null;
  }

  // When the modal is open, we add the 'prof-is-open' class to the
  // main container. This gives it a higher z-index (1001)
  // so it appears *above* the overlay and all other buttons.  - E.H
  const containerClass = isOpen
    ? "prof-info-container prof-is-open"
    : "prof-info-container";

  return (
    <div className={containerClass}>
      {/* Button to toggle popup */}
      <button
        className="prof-info-btn"
        aria-label="Professor Info"
        onClick={handleOpen}
        type="button"
      >
        {/* SVG Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </button>

      {/* Popup content — only visible if `open` is true */}
      {isOpen && (
        <div className="prof-info-modal-overlay" onClick={handleOverlayClick}>
          <div className="prof-info-modal" role="dialog" aria-modal="true">
            <div className="prof-info-header">
              <h3 className="prof-info-title">Professor Info</h3>
              <button
                className="prof-info-close"
                onClick={handleOpen}
                type="button"
                aria-label="Close"
              >
                X
              </button>
            </div>

            {/* AMP section */}
            <div className="campus-card">
              <div className="campus-card-header">
                <h4>About the Professor</h4>
              </div>
              <div className="campus-card-hero">
                {isPhoto ? (
                  <img
                    className="prof-photo"
                    src={isPhoto}
                    alt="Professor photo"
                  />
                ) : (
                  <img
                    className="prof-photo"
                    src={chrome.runtime.getURL("images/default_pfp.png")}
                    alt="Default profile picture"
                  />
                )}

                <div className="campus-card-hero-text">
                  <h5>{name}</h5>
                  <div className="campus-chip-row">
                    {department && (
                      <span className="campus-chip">{department}</span>
                    )}
                    {showDivision && (
                      <span className="campus-chip subtle">
                        {divisionValue}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* campus card section*/}
              {/* email/phone */}
              {contactItems.length > 0 && (
                <div className="campus-card-grid">
                  {contactItems.map((item) => (
                    <div className="campus-detail" key={item.label}>
                      <span className="detail-label">{item.label}</span>
                      {item.href ? (
                        <a className="detail-value" href={item.href}>
                          {item.value}
                        </a>
                      ) : (
                        <span className="detail-value">{item.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* More Info Section */}
              {hasMoreInfo && (
                <button
                  className="prof-info-more-btn"
                  onClick={handleToggleMoreInfo}
                  type="button"
                >
                  {showMoreInfo ? "Show Less" : "More Info"}
                </button>
              )}

              {/* More Info Section */}
              {showMoreInfo && (
                <div className="prof-info-more-section">
                  {/* office hours */}
                  {officeHours && (
                    <div className="campus-card-section">
                      <p>
                        <strong>Office Hours:</strong> {officeHours}
                      </p>
                    </div>
                  )}

                  {/* Courses Taught */}
                  {Array.isArray(courses) && courses.length > 0 && (
                    <div className="campus-card-section">
                      <p>
                        <strong>Courses Taught:</strong>
                      </p>
                      <ul>
                        {courses.map((course, i) => (
                          <li key={i}>{course}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* research interests/topics */}
                  {researchTopicText || researchInterest ? (
                    <div className="campus-card-section">
                      {/* Research Interest */}
                      {researchInterest &&
                        typeof researchInterest === "string" && (
                          <div
                            dangerouslySetInnerHTML={{
                              __html:
                                "<p><strong>Research Interests: </strong>" +
                                researchInterest +
                                "</p>",
                            }}
                          />
                        )}

                      {/* Research Topic */}
                      {researchTopicText && (
                        <div
                          style={{
                            marginTop: researchInterest ? "10px" : "0",
                          }}
                        >
                          <p>
                            <strong>Research Topic:</strong> {researchTopicText}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="campus-card-section">
                      <p>
                        <strong>Research Info:</strong> Not listed in public
                        directory.
                      </p>
                    </div>
                  )}
                  
                  {/* Selected publications and website */}
                  {detailItems.length > 0 && (
                    <div className="campus-card-grid">
                      {detailItems.map((item, index) => (
                        <div
                          className="campus-detail"
                          key={`${item.label}-${index}`}
                        >
                          <span className="detail-label">{item.label}</span>
                          {item.href ? (
                            <a
                              className="detail-value"
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {item.value}
                            </a>
                          ) : (
                            <span className="detail-value">{item.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* RMP section*/}
            {/* will only show if the prof does have a existing rmp profile */}
            {rateMyProfessor && (
              <div className="rmp-section">
                {rateMyProfessor ? (
                  <div className="rmp-card">
                    <div className="rmp-card-header">
                      <h4>Rate My Professors</h4>
                      {profileUrl && (
                        <a href={profileUrl} target="_blank" rel="noreferrer">
                          View Profile
                        </a>
                      )}
                    </div>

                    <div className="rmp-card-grid">
                      {/* stars rating */}
                      <div className="rmp-metric rating">
                        {numRatings > 0 ? (
                          <StarRating
                            rating={roundedRating}
                            numRatings={numRatings}
                          />
                        ) : (
                          <span className="metric-value-na">N/A</span>
                        )}
                        <span className="metric-sub">
                          {numRatings > 0 ? "Average score" : "No ratings yet"}
                        </span>
                      </div>

                      {/* difficulty */}
                      <div className="rmp-metric difficulty">
                        <span className="metric-label">Difficulty</span>
                        <span className="metric-value">
                          {roundedDifficulty &&
                          roundedDifficulty > 0 &&
                          numRatings > 0
                            ? `${formatNumber(roundedDifficulty)}/5`
                            : "N/A"}
                        </span>
                        <span className="metric-sub">Avg difficulty</span>
                      </div>

                      {/* would take */}
                      <div className="rmp-metric would-take">
                        <span className="metric-label">Would Take Again</span>
                        <span className="metric-value">
                          {roundedWouldTakeAgain != null &&
                          roundedWouldTakeAgain >= 0 &&
                          numRatings > 0
                            ? `${roundedWouldTakeAgain}%`
                            : "N/A"}
                        </span>
                        <span className="metric-sub">Student approval</span>
                      </div>

                      <div className="rmp-metric total-ratings">
                        <span className="metric-label">Reviews</span>
                        <span className="metric-value">
                          {roundedWouldTakeAgain != null ? numRatings : "N/A"}
                        </span>
                        <span className="metric-sub">Total reviews</span>
                      </div>
                    </div>

                    {/* top tags */}
                    {topTags.length > 0 && (
                      <div className="rmp-tags">
                        <span className="tags-label">Top Tags</span>
                        <div className="tags-grid">
                          {topTags.slice(0, 5).map((tag) => (
                            <span
                              className="tag-chip"
                              key={tag.id || tag.legacyId || Math.random()}
                            >
                              <span className="tag-name">
                                {tag.tagName.length > 20
                                  ? tag.tagName.substring(0, 20) + "..."
                                  : tag.tagName}
                              </span>
                              <span className="tag-count">{tag.tagCount}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // empty state
                  <div className="rmp-card empty">
                    <div className="rmp-card-header">
                      <h4>Rate My Professors</h4>
                    </div>
                    <p className="rmp-empty">
                      Rate My Professors data not available.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
