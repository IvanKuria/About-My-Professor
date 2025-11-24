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
function getProfNameInSearch(panel) {
  const profDivs = panel.querySelectorAll("div.col-xs-6.col-sm-3");

  for (const div of profDivs) {
    const text = div.textContent.trim();
    if (text.includes("Instructor:")) {
      const name = text.replace("Instructor:", "").trim();
      //console.log(name);
      return name;
    }
  }
  // Moved this here so I could modularize the render function to also work for the shopping cart page - B.C.

  // console.log(panel.innerText) - use this instead
  // finds "Instructor", optional "s", and whitespaces - E.H
  const re = /Instructor[s]?:\s*([\w,.'-]+)/i;

  // if the regex doesn't find a match - E.H
  // if (name == null) {
  let text = panel.innerText;
  let res = text.match(re);

  if (res && res[1]) {
    const name = res[1];
    return name;
  } else {
    console.log("Couldn't parse prof name for panel", panel);
    //return;
  }
  //console.log("name from regex ",name);
  //}
  return null; // if name isn't found for whatever reason
}

//Find Professor Name from row div in shopping cart - B.C.
function getProfNameInCart(panel) {
  const nameBox = panel.querySelector(
    '[id^="win0divDERIVED_REGFRM1_SSR_INSTR_LONG$"]',
  );
  console.log(nameBox);
  if (nameBox==null){
    return null;
  }
 
  let name = nameBox.outerText;
  //console.log(name);
  if (name == "" || name == undefined || name == null) {
    return null;
  }
  //need to reformat the name (J. Doe) so it matches the format from the search page ("Doe,J.") - B.C.
  let firstIntial = name.slice(0, 2); // instead need to use regex to match up to the first space
  const reFI = /^([^\s]+)/i;
  let res = name.match(reFI);
  if (res && res[1]) {
    firstIntial = res[1];
  } else {
    console.log("Couldn't parse prof first intial for div from cart", panel);
    return null;
  }
  let sliceTarget = firstIntial.length + 1;
  let lastName = name.slice(sliceTarget);
  let formattedName = lastName + "," + firstIntial;
  return formattedName;
}

//Modularized this and other parts to reduce repetition for shopping cart B.C.
function getUIDFromJson(name) {

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
  return uID;
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

//This function find out which page we are at (Search or Shopping Cart) by checking html elements
// and calls the corresponding render function if at either one - B.C.
function whichPage() {
  let searchPage = false;
  let cartPage = false;
  //check if panels from the Search/Cart page exist - B.C.
  const panelsSearch = document.querySelectorAll(".panel.panel-default.row");
  if (!panelsSearch || panelsSearch.length === 0) {
    //console.log("not in searchPage");
  } else {
    searchPage = true;
    //console.log("found panel div in the Class Search Page");
  }
  const panelsCartShopping = document.querySelectorAll(
    '[id^="trSSR_REGFORM_VW$0_row"]',
  );
  if (!panelsCartShopping || panelsCartShopping.length === 0) {
    //console.log("nothing in the shopping Cart");
  } else {
    cartPage = true;
    //console.log("found row div in the Cart for Shopping");
  }
  const panelsCartEnrolled = document.querySelectorAll(
    '[id^="trSTDNT_ENRL_SSVW$0_row"]',
  );
  if (!panelsCartEnrolled || panelsCartEnrolled.length === 0) {
    //console.log("empty enrolled section in Shopping Cart page");
  } else {
    cartPage = true;
    //console.log("found row div in the Cart for Enrolled");
  }

  //handle cases of each page or if none don't do anything - B.C.
  if (searchPage == true) {
    renderIntoSearchPanels(panelsSearch);
  } else if (cartPage == true) {
    const panels = [...panelsCartShopping, ...panelsCartEnrolled];
    renderIntoCartPanels(panels);
  } else return;
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
 * functions to inject the React info-button component into each course pannel.
 * Main function to find all course panels on the page and inject
 * the React info-button component into each one.
 * This function is 'async' because it must 'await' the API
 * response from the background script for each panel.
 */
async function renderIntoSearchPanels(panels) {
  // maps full name -> research topic
  const researchTopics = await fetchLocalResearchData();

  for (const panel of panels) {
    if (panel.querySelector(".about-my-professor-root")) return; // avoid duplicate mounts(will come in handy when we cache the results)

    //get name from panel
    let name = getProfNameInSearch(panel);
    if (name == null) {
      continue;
    }

    //Modularized this - B.C.
    let uID = getUIDFromJson(name);

    //get Prof Info from API - B.C.
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
    //1. Find the main course title header (the <h2>)

    const mount = document.createElement("span");
    mount.className = "about-my-professor-root";
    const targetPanel = panel;

    // 2. Add a class to the panel itself so we can use 'position: relative'
    targetPanel.classList.add("prof-panel-relative");
    targetPanel.appendChild(mount);

    // 3. Find the <h2> and *remove* the flex class if it's there
    const targetHeader = panel.querySelector("h2");
    if (targetHeader) {
      targetHeader.classList.remove("prof-info-header-flex");
    }

    /** Keeping old placement just in case we want it back  - E.H */
    //panel.appendChild(mount);
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

async function renderIntoCartPanels(panels) {
  for (const panel of panels) {
    if (panel.querySelector(".about-my-professor-root")) return; // avoid duplicate mounts(will come in handy when we cache the results)

    const researchTopics = await fetchLocalResearchData();
    let name = getProfNameInCart(panel);
    if (name == null) {
      continue;
    }

    //Modularized this - B.C.
    let uID = getUIDFromJson(name);

    //get Prof Info from API - B.C.
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

    //create a mount and add it to the page's html
    const mount = document.createElement("div");
    mount.className = "about-my-professor-root";
    const targetPanel = panel;
    //change this to be custom css for cart page and mby just mount directly onto the targetPanel
    targetPanel.classList.add("prof-cart-panel");
    // win0divE/P_CLASS_NAME$ or win0divDERIVED_REGFRM1_SSR_STATUS_LONG or win0divDERIVED_REGFRM1_SSR_INSTR_LONG$ - mounting column doesn't seem to change this
    const box = targetPanel.querySelector(
      '[id*="win0divDERIVED_REGFRM1_SSR_INSTR_LONG$"]',
    );
    box.appendChild(mount);

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
          />
        </React.StrictMode>,
      );
    }
  }
}

// Initial attempt after a short delay
setTimeout(whichPage, 3000);
