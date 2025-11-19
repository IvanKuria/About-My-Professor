import React from "react";
import { createRoot } from "react-dom/client";
import ProfInfoButton from "../react/components/ProfInfoButton.jsx";
import data from "../data/prof_uids.json";
import { getFirst } from "../utils/utils.js";

/**
 * Scrapes the professor's name from a specific, known HTML structure
 * in a class panel.
 * @param {Element} panel - The DOM element for a single course panel.
 * @returns {string | null} The professor's name (e.g., "TANTALO,C") or null if not found.
 */
function getProfName(panel) {
  const profDivs = panel.querySelectorAll("div.col-xs-6.col-sm-3");

  for (const div of profDivs) {
    const text = div.textContent.trim();
    if (text.includes("Instructor:")) {
      const name = text.replace("Instructor:", "").trim();
      //console.log(name);
      return name;
    }
  }
  return null; // if name isn't found for whatever reason
}

/**
 * Sends a message to the background script to fetch all professor data
 * (both from the Campus Directory and RateMyProfessors).
 * @param {string} uID - The professor's User ID (e.g., "pdey").
 * @param {string} name - The professor's name from the panel (e.g., "DEY,P.").
 * @returns {Promise<object>} A promise that resolves with the complete profile object.
 */
async function getProfessorData(uID, name) {
  return chrome.runtime.sendMessage({
    action: "fetchProfessorData",
    ID: uID,
    name,
  });
}

/**
 * Fetches research topics from the local JSON file.
 * @returns {Promise<object>} A dictionary mapping Full Name to Research Topic.
 */
async function fetchLocalResearchData() {
  const url = chrome.runtime.getURL("prof_research_topics.json");
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to load research JSON: ${response.status}`);
      return {};
    }
    return await response.json();
  } catch (e) {
    console.error("Error parsing research JSON:", e);
    return {};
  }
}

/**
 * Main function to find all course panels on the page and inject
 * the React info-button component into each one.
 * This function is 'async' because it must 'await' the API
 * response from the background script for each panel.
 */
async function renderIntoPanels() {
  const panels = document.querySelectorAll(".panel.panel-default.row");
  if (!panels || panels.length === 0) return;

  // maps full name -> research topic
  const researchTopics = await fetchLocalResearchData();

  for (const panel of panels) {
    if (panel.querySelector(".about-my-professor-root")) return; // avoid duplicate mounts(will come in handy when we cache the results)

    //get name from panel
    let name = getProfName(panel);
    // console.log(panel.innerText) - use this instead
    // finds "Instructor", optional "s", and whitespaces - E.H
    const re = /Instructor[s]?:\s*([\w,.'-]+)/i;

    // if the regex doesn't find a match - E.H
    if (name == null) {
      let text = panel.innerText;
      let res = text.match(re);

      if (res && res[1]) {
        name = res[1];
      } else {
        console.log("Couldn't parse prof name for panel", panel);
        return;
      }
      //console.log("name from regex ",name);
    }

    // //get uID from json
    // let uID = "jdoe";
    // //console.log(data);
    // //get uID by indexing the json data as a dictionary
    // if (data[name]) {
    //   uID = data[name];
    // } else {
    //   console.log(
    //     "couldn't match name to uID in the json, gave output",
    //     data[name],
    //     "for name: ",
    //     name,
    //   );
    // }
    //console.log(uID);

    //get uID from json
    let uID = "jdoe";
    if (data[name]) {
      const value = String(data[name]); // Get the value, e.g., "https://...uid=chern133"

      // Use regex to find 'uid=' and capture what's after it
      const uidMatch = value.match(/uid=([\w-]+)/);

      if (uidMatch && uidMatch[1]) {
        // Found a match! e.g., uidMatch[1] is "chern133"
        uID = uidMatch[1];
      } else if (!value.includes("http")) {
        // Fallback: The value might already be a clean UID
        uID = value;
      } else {
        // The value was a bad URL or something we couldn't parse
        console.log(`Found invalid UID value for ${name}: ${value}`);
      }
    } else {
      console.log(`Couldn't match name to uID in the json for name: ${name}`);
    }

    //get fullName from API
    let profileDict = null;
    if (uID != "jdoe") {
      try {
        profileDict = await getProfessorData(uID, name);
      } catch (error) {
        console.error("Error fetching professor data", error);
        profileDict = null;
      }
      if (profileDict?.data?.success === false) {
        profileDict.data = null;
      }
    }
    //console.log("dict: ", profileDict?.data);

    let profData,
      rateMyProfessorData,
      researchTopicText,
      fullName = null;
    // get full data from API
    if (profileDict != null) {
      profData = profileDict.data;
      rateMyProfessorData = profileDict.rateMyProfessor;
      fullName = getFirst(profData?.cn);
      researchTopicText = researchTopics[[fullName]];
    }

    // Find the main course title header (the <h2>)
    const targetPanel = panel;

    const mount = document.createElement("span");
    mount.className = "about-my-professor-root";

    // 2. Add a class to the panel itself so we can use 'position: relative'
    targetPanel.classList.add("prof-panel-relative");
    targetPanel.appendChild(mount);

    // 3. Find the <h2> and *remove* the flex class if it's there
    const targetHeader = panel.querySelector("h2");
    if (targetHeader) {
      targetHeader.classList.remove("prof-info-header-flex");
    }

    /** Keeping old placement just in case we want it back  - E.H */
    // const mount = document.createElement("div");
    // mount.className = "about-my-professor-root";
    // // panel.appendChild(mount);
    // const columns = panel.querySelectorAll("div.col-xs-6.col-sm-3");
    // if (columns.length > 0) {
    //   // Get the last column (which contains "In Person")
    //   const lastColumn = columns[columns.length - 1];
    //   // Append the button container inside it
    //   lastColumn.appendChild(mount);
    // } else {
    //   // Fallback in case the structure is different
    //   panel.appendChild(mount);
    // }
    const root = createRoot(mount);

    // in a typical react application, you'll render the main entry point within 'root'
    // however, in our case we will render it elsewhere(our own custom 'root')
    // also pass profile dictionary (from the API) as a property (variable) to the component
    if (uID != "jdoe") {
      root.render(
        <React.StrictMode>
          <ProfInfoButton
            apiData={profData}
            rateMyProfessor={rateMyProfessorData}
            localResearchTopic={researchTopicText} // Pass the specific research topic as a string
          />
        </React.StrictMode>,
      );
    }
  }
}

// Initial attempt after a short delay for the iframe
setTimeout(renderIntoPanels, 1500);
