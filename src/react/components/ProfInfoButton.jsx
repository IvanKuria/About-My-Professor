import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Draggable from "react-draggable";
import "../styles/index.css";
import {
  getFirst,
  toNumber,
  roundToWhole,
  roundToOneDecimal,
  formatNumber,
  StarRating,
} from "../../utils/utils";

// track the highest Z-Index across all professor buttons
// ensures that the most recently clicked card always pops to the front  - E.H
if (typeof window.AMP_Z_INDEX === "undefined") {
  window.AMP_Z_INDEX = 10000;
}

// active card registry: prevents duplicates
if (typeof window.AMP_ACTIVE_CARDS === "undefined") {
  window.AMP_ACTIVE_CARDS = {};
}

export default function ProfInfoButton(props) {
  // --- STATES ---
  const [isOpen, setIsOpen] = useState(false); // for the open/close functionality of info button
  const [isPhoto, setIsPhoto] = useState(""); // for the professor profile pic
  const [showMoreInfo, setShowMoreInfo] = useState(false); // for more info button
  const [isDraggable, setIsDraggable] = useState(false); // dragging state (default = locked)
  const [zIndex, setZIndex] = useState(window.AMP_Z_INDEX); // local z-index state for popup placement
  const [spawnPos, setSpawnPos] = useState({ x: 0, y: 0 }); // local state to store where the modal should appear
  const nodeRef = useRef(null); // Ref required for draggable in React StrictMode

  // --- DATA PROCESSING ---
  const localResearchTopic = props.localResearchTopic;
  const localClassesTaught = props.localClassesTaught;
  const rateMyProfessor = props.rateMyProfessor;

  // rate my professor data - I.K
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

  // Campus Directory Data
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
  const courses =
    localClassesTaught || props.apiData?.ucscpersonpubfacultycourses; // assumes this is already an array

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  // Logic to only show division if it's different from the department
  const showDivision =
    divisionValue &&
    department &&
    normalize(divisionValue) !== normalize(department);

  // global id for global registry
  const profId = name;

  // --- HELPERS ---

  // global id for global registry
  const profId = name;

  // --- HELPERS ---

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

  // Items hidden in "More Info"
  // Items hidden in "More Info"
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

  // function to bring this specific card to the front
  const bringToFront = useCallback(() => {
    window.AMP_Z_INDEX += 1;
    setZIndex(window.AMP_Z_INDEX);
  }, []);

  // logic specifically for closing
  const handleClose = (e) => {
    e.stopPropagation();
    setIsOpen(false);
  };
  // function to bring this specific card to the front
  const bringToFront = useCallback(() => {
    window.AMP_Z_INDEX += 1;
    setZIndex(window.AMP_Z_INDEX);
  }, []);

  // logic specifically for closing
  const handleClose = (e) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  /**
   * Toggles the "More Info" collapsible section.
   */
  function handleToggleMoreInfo(e) {
    e.stopPropagation();
    setShowMoreInfo((prev) => !prev);
  }

  // toggle lock/unlock for dragging
  const toggleDraggable = (e) => {
    e.stopPropagation();
    setIsDraggable((prev) => !prev);
  };

  // toggle lock/unlock for dragging
  const toggleDraggable = (e) => {
    e.stopPropagation();
    setIsDraggable((prev) => !prev);
  };

  /**
   * Effect hook to load the professor's photo only when the modal is opened and we have data.  - E.H
   * Also handles which popup appears depending on what the user clicks on
   * Also handles which popup appears depending on what the user clicks on
   */
  useEffect(() => {
    if (isOpen) {
      handlePhotoURL();
      window.AMP_ACTIVE_CARDS[profId] = bringToFront;
    }

    // clean up
    return () => {
      if (isOpen && window.AMP_ACTIVE_CARDS[profId] === bringToFront) {
        delete window.AMP_ACTIVE_CARDS[profId];
      }
    };
  }, [isOpen, handlePhotoURL, bringToFront, profId]); // runs when any of these change

  // opening logic for the info button
  const handleInfoClick = (e) => {
    // get viewport dimensions
    const vw = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0,
    );
    const vh = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0,
    );

    // get button position
    const btn = e.currentTarget.getBoundingClientRect();

    // define card dimensions
    const CARD_W = 360;
    const CARD_H = 550;
    const GAP = 12;

    // calculate X (Horizontal)
    let finalX = btn.right + GAP; // Try placing to the right first

    // Check if it goes off the right edge
    if (finalX + CARD_W > vw) {
      // try placing to the left
      finalX = btn.left - CARD_W - GAP;
    }

    // check if it goes off the left edge (e.g., mobile screen)
    if (finalX < 0) {
      // if screen is too narrow for offsets, roughly center it
      finalX = (vw - CARD_W) / 2;
      // make sure it doesn't go negative even after centering attempts
      if (finalX < 10) finalX = 10;
    }

    // calculate Y (Vertical)
    let finalY = btn.top;

    // check if it goes off the bottom edge
    if (finalY + CARD_H > vh) {
      // shift it up so the bottom rests near the window bottom
      finalY = vh - CARD_H - GAP;
    }

    // check if it goes off the top edge
    if (finalY < 10) finalY = 10;

    setSpawnPos({ x: finalX, y: finalY });

    // check if any card for this prof is already open
    if (window.AMP_ACTIVE_CARDS[profId]) {
      // if so, bring that card to front
      window.AMP_ACTIVE_CARDS[profId]();
      return;
    }

    // otherwise, open this specific instance
    if (!isOpen) {
      setIsOpen(true);
      setShowMoreInfo(false);
      setIsDraggable(false);
    }

    // register immediately so the very next click knows about it
    window.AMP_ACTIVE_CARDS[profId] = bringToFront;
    bringToFront();
  };
      window.AMP_ACTIVE_CARDS[profId] = bringToFront;
    }

    // clean up
    return () => {
      if (isOpen && window.AMP_ACTIVE_CARDS[profId] === bringToFront) {
        delete window.AMP_ACTIVE_CARDS[profId];
      }
    };
  }, [isOpen, handlePhotoURL, bringToFront, profId]); // runs when any of these change

  // opening logic for the info button
  const handleInfoClick = (e) => {
    // get viewport dimensions
    const vw = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0,
    );
    const vh = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0,
    );

    // get button position
    const btn = e.currentTarget.getBoundingClientRect();

    // define card dimensions
    const CARD_W = 360;
    const CARD_H = 550;
    const GAP = 12;

    // calculate X (Horizontal)
    let finalX = btn.right + GAP; // Try placing to the right first

    // Check if it goes off the right edge
    if (finalX + CARD_W > vw) {
      // try placing to the left
      finalX = btn.left - CARD_W - GAP;
    }

    // check if it goes off the left edge (e.g., mobile screen)
    if (finalX < 0) {
      // if screen is too narrow for offsets, roughly center it
      finalX = (vw - CARD_W) / 2;
      // make sure it doesn't go negative even after centering attempts
      if (finalX < 10) finalX = 10;
    }

    // calculate Y (Vertical)
    let finalY = btn.top;

    // check if it goes off the bottom edge
    if (finalY + CARD_H > vh) {
      // shift it up so the bottom rests near the window bottom
      finalY = vh - CARD_H - GAP;
    }

    // check if it goes off the top edge
    if (finalY < 10) finalY = 10;

    setSpawnPos({ x: finalX, y: finalY });

    // check if any card for this prof is already open
    if (window.AMP_ACTIVE_CARDS[profId]) {
      // if so, bring that card to front
      window.AMP_ACTIVE_CARDS[profId]();
      return;
    }

    // otherwise, open this specific instance
    if (!isOpen) {
      setIsOpen(true);
      setShowMoreInfo(false);
      setIsDraggable(false);
    }

    // register immediately so the very next click knows about it
    window.AMP_ACTIVE_CARDS[profId] = bringToFront;
    bringToFront();
  };

  // This component won't render anything if it doesn't get apiData
  if (!props.apiData) {
    return null;
  }

  return (
    <div className="prof-info-container">
    <div className="prof-info-container">
      {/* Button to toggle popup */}
      <button
        className="prof-info-btn"
        aria-label="Professor Info"
        onClick={handleInfoClick}
        onClick={handleInfoClick}
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
      {isOpen &&
        createPortal(
          <Draggable
            nodeRef={nodeRef}
            defaultPosition={spawnPos}
            disabled={!isDraggable} // locked by default
            cancel="button, a .prof-info-more-btn" // prevent dragging when interacting with these elements
            onMouseDown={bringToFront} // clicking anywhere on card brings it to the front
          >
            {/* Draggable requires a direct child ref with fixed positioning */}
            <div
              ref={nodeRef}
              style={{ position: "fixed", zIndex: 10000, top: 0, left: 0 }}
            >
              <div
                className={`prof-sticky-card ${isDraggable ? "draggable-active" : ""}`}
              >
                {/* --- HEADER --- */}
                <div className="prof-sticky-header">
                  <h3 className="prof-info-title">Professor Info</h3>

                  <div className="header-controls">
                    {/* Lock/Unlock Toggle */}
                    <button
                      className={`prof-pin-btn ${isDraggable ? "unlocked" : "locked"}`}
                      onClick={toggleDraggable}
                      type="button"
                      title={
                        isDraggable
                          ? "Unlocked: Drag to move"
                          : "Locked: Click to move"
                      }
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {isDraggable ? (
                        /* UNLOCKED ICON (Open Padlock) */
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                        </svg>
                      ) : (
                        /* LOCKED ICON (Closed Padlock) */
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="none"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      )}
                    </button>

                    {/* Close Button */}
                    <button
                      className="prof-info-close"
                      onClick={handleClose}
                      type="button"
                      aria-label="Close"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      X
                    </button>
                  </div>
                </div>
      {isOpen &&
        createPortal(
          <Draggable
            nodeRef={nodeRef}
            defaultPosition={spawnPos}
            disabled={!isDraggable} // locked by default
            cancel="button, a .prof-info-more-btn" // prevent dragging when interacting with these elements
            onMouseDown={bringToFront} // clicking anywhere on card brings it to the front
          >
            {/* Draggable requires a direct child ref with fixed positioning */}
            <div
              ref={nodeRef}
              style={{ position: "fixed", zIndex: 10000, top: 0, left: 0 }}
            >
              <div
                className={`prof-sticky-card ${isDraggable ? "draggable-active" : ""}`}
              >
                {/* --- HEADER --- */}
                <div className="prof-sticky-header">
                  <h3 className="prof-info-title">Professor Info</h3>

                  <div className="header-controls">
                    {/* Lock/Unlock Toggle */}
                    <button
                      className={`prof-pin-btn ${isDraggable ? "unlocked" : "locked"}`}
                      onClick={toggleDraggable}
                      type="button"
                      title={
                        isDraggable
                          ? "Unlocked: Drag to move"
                          : "Locked: Click to move"
                      }
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {isDraggable ? (
                        /* UNLOCKED ICON (Open Padlock) */
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                        </svg>
                      ) : (
                        /* LOCKED ICON (Closed Padlock) */
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="none"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      )}
                    </button>

                    {/* Close Button */}
                    <button
                      className="prof-info-close"
                      onClick={handleClose}
                      type="button"
                      aria-label="Close"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      X
                    </button>
                  </div>
                </div>

                {/* --- SCROLLABLE CONTENT --- */}
                <div className="prof-sticky-content">
                  {/* AMP section */}
                  <div className="campus-card">
                    <div className="campus-card-header">
                      <h4>About the Professor</h4>
                    </div>

                    {/* Hero: Photo + Info */}
                    <div className="campus-card-hero">
                      {isPhoto ? (
                        <img
                          className="prof-photo"
                          src={isPhoto}
                          alt="Professor"
                        />
                      ) : (
                        <img
                          className="prof-photo"
                          src={chrome.runtime.getURL("images/default_pfp.png")}
                          alt="Default"
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

                    {/* campus card section (always visible)*/}
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
                    {/* campus card section (always visible)*/}
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
                        {showMoreInfo ? "Show Less ▲" : "More Info ▼"}
                      </button>
                    )}

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
                                  <strong>Research Topic:</strong>{" "}
                                  {researchTopicText}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="campus-card-section">
                            <p>
                              <strong>Research Info:</strong> Not listed in
                              public directory.
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
                                <span className="detail-label">
                                  {item.label}
                                </span>
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
                                  <span className="detail-value">
                                    {item.value}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* RMP section*/}
                  {/* will only show if the prof does have an existing RMP profile */}
                  {rateMyProfessor && (
                    <div className="rmp-section">
                      {rateMyProfessor ? (
                        <div className="rmp-card">
                          <div className="rmp-card-header">
                            <h4>Rate My Professors</h4>
                            {profileUrl && (
                              <a
                                href={profileUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View Profile
                              </a>
                            )}
                          </div>

                          <div className="rmp-card-grid">
                            {/* stars rating */}
                            <div className="rmp-metric">
                              <span className="metric-label">Rating</span>
                              {numRatings > 0 ? (
                                <div className="star-rating">
                                  <StarRating
                                    rating={roundedRating}
                                    numRatings={numRatings}
                                  />
                                </div>
                              ) : (
                                <span className="metric-value-na">N/A</span>
                              )}
                              <span className="metric-sub">
                                {numRatings > 0
                                  ? "Average score"
                                  : "No ratings yet"}
                              </span>
                            </div>
                          <div className="rmp-card-grid">
                            {/* stars rating */}
                            <div className="rmp-metric">
                              <span className="metric-label">Rating</span>
                              {numRatings > 0 ? (
                                <div className="star-rating">
                                  <StarRating
                                    rating={roundedRating}
                                    numRatings={numRatings}
                                  />
                                </div>
                              ) : (
                                <span className="metric-value-na">N/A</span>
                              )}
                              <span className="metric-sub">
                                {numRatings > 0
                                  ? "Average score"
                                  : "No ratings yet"}
                              </span>
                            </div>

                            {/* difficulty */}
                            <div className="rmp-metric difficulty">
                              <span className="metric-label">Difficulty</span>
                              <span
                                className={`metric-value ${
                                  roundedDifficulty &&
                                  roundedDifficulty > 0 &&
                                  numRatings > 0
                                    ? roundedDifficulty >= 4
                                      ? "diff-high"
                                      : roundedDifficulty >= 2.6
                                        ? "diff-mid"
                                        : "diff-low"
                                    : ""
                                }`}
                              >
                                {roundedDifficulty &&
                                roundedDifficulty > 0 &&
                                numRatings > 0
                                  ? `${formatNumber(roundedDifficulty)}/5`
                                  : "N/A"}
                              </span>
                              <span className="metric-sub">Avg difficulty</span>
                            </div>

                            {/* would take again */}
                            <div className="rmp-metric would-take">
                              <span className="metric-label">
                                Would Take Again
                              </span>
                              <span
                                className={`metric-value ${
                                  roundedWouldTakeAgain != null &&
                                  roundedWouldTakeAgain >= 0 &&
                                  numRatings > 0
                                    ? roundedWouldTakeAgain <= 40
                                      ? "wta-low"
                                      : roundedWouldTakeAgain <= 70
                                        ? "wta-mid"
                                        : "wta-high"
                                    : ""
                                }`}
                              >
                                {roundedWouldTakeAgain != null &&
                                roundedWouldTakeAgain >= 0 &&
                                numRatings > 0
                                  ? `${roundedWouldTakeAgain}%`
                                  : "N/A"}
                              </span>
                              <span className="metric-sub">
                                Student approval
                              </span>
                            </div>

                            {/* total reviews */}
                            <div className="rmp-metric total-ratings">
                              <span className="metric-label">Reviews</span>
                              <span className="metric-value">
                                {numRatings || "0"}
                              </span>
                              <span className="metric-sub">Total Reviews</span>
                            </div>
                          </div>
                            {/* total reviews */}
                            <div className="rmp-metric total-ratings">
                              <span className="metric-label">Reviews</span>
                              <span className="metric-value">
                                {numRatings || "0"}
                              </span>
                              <span className="metric-sub">Total Reviews</span>
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
                                    key={
                                      tag.id || tag.legacyId || Math.random()
                                    }
                                  >
                                    <span className="tag-name">
                                      {tag.tagName.length > 20
                                        ? `${tag.tagName.substring(0, 20)}...`
                                        : tag.tagName}
                                    </span>
                                    <span className="tag-count">
                                      {tag.tagCount}
                                    </span>
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
            </div>
          </Draggable>,
          document.body,
        )}
    </div>
  );
}
