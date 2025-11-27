# About My Professor – Chrome Extension

This Chrome Extension enhances the UCSC course enrollment site by injecting **professor information cards** under each course panel.  
It fetches professor data from UCSC’s public directory API using each professor’s UID.

---

## Features

- Detects course panels on UCSC enrollment pages.
- Extracts abbreviated professor names and maps them to UIDs.
- Calls UCSC’s public API to fetch professor information.
- Injects a React component (info card) directly under each professor’s name.
- Caches API results locally to reduce repeated requests.()

---

## Tech Stack

- **Manifest v3** – Chrome extension base
- **React + Webpack** – UI framework and bundler
- **Content Scripts** – scan and inject React roots
- **Background Service Worker** – API fetch + caching
- **Jest** – Unit and Component testing
- **Playwright** – End-to-End (E2E) browser testing
- **CSS** – styling
- **chrome.storage.local** – cache layer
- **prof-map.json** – local mapping of abbreviated names → UID

---

## Project Structure

- to be made later lol

## Steps to run the Extension

1. Make sure to have these dependencies installed:
   - **Node.js**
     - Mac:
       - make sure to install [Homebrew](https://brew.sh/)
       - run `brew install node` or follow [this](https://formulae.brew.sh/formula/node)
     - Windows:
       - follow this [link](https://nodejs.org/dist/v22.20.0/node-v22.20.0-x86.msi)
   - **Git**
     - Mac:
       - run `brew install git`
     - Windows:
       - follow this [link](https://git-scm.com/downloads/win)
2. Navigate to the directory of your choice and run the following commands:
   - `git clone https://github.com/IvanKuria/About-My-Professor`
   - `npm i`
   - `npm run build`

3. Navigate to `chrome://extensions/` in the search bar
4. Make sure to turn on `Developer Mode` in the top right corner
5. Click on `Load Unpacked` in the top left corner
6. When prompted, navigate to the direcory where you cloned the repo and select the `Dist` folder.
7. Navigate to `https://my.ucsc.edu/psc/csprd/EMPLOYEE/SA/c/NUI_FRAMEWORK.PT_AGSTARTPAGE_NUI.GBL?CONTEXTIDPARAMS=TEMPLATE_ID%3aPTPPNAVCOL&scname=ADMN_ENROLLMENT&PTPPB_GROUPLET_ID=SCX_ENROLLMENT&CRefName=ADMN_NAVCOLL_4&PanelCollapsible=Y&AJAXTransfer=Y`
8. Perform any search you want and you should see 'Hello World' in red appear under each prof panel :)

## Testing

We're using [Jest](https://jestjs.io/) for unit testing logic and components, and [Playwright](https://playwright.dev/) for End-to-End testing to simulate how our extension behaves in a real (chrome) browser environment.

### Prerequisites

Before running E2E tests, you must build the extension first (the commands below in `package.json` already handles this):
`npm run build`

### Running Tests

| Command             | Description                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| npm run test:unit   | Runs Jest tests. Verifies utility functions and React component logic in isolation.                                                      |
| npm run test:e2e    | Runs Playwright tests in Headless mode. Launches a browser with the extension loaded and tests against a local mock of the UCSC website. |
| npm run test:e2e:ui | Runs Playwright in UI Mode. Opens a dashboard where you can watch the browser execute tests step-by-step.                                |
| npm test            | Runs both Unit and E2E tests sequentially.                                                                                               |

## Chrome Extension Resources

I recommend checking out the following to get familiar working with chrome extensions

- [Chrome Extension Architecture](https://youtu.be/TRwYaZPJ0h8?si=d9pQA1qZT-87j-Ap)
- [FreeCodeCamp Intro](https://youtu.be/0n809nd4Zu4?si=6lfGnFvhqnSIX1A1)
- [Chrome Extension + React](https://youtu.be/GGi7Brsf7js?si=xrqKeF2iaKOHw4Mz)

## React + Javascript Resources

Do the JavaScript course first to get familiar with the syntax

- [Javascript Course](https://youtu.be/TjjKcgtlsY8?si=WKOmxTh5OnYq0tlq)
- [React Course](https://youtu.be/dCLhUialKPQ?si=O68IEC16F4yZ4KJk)

## Notes

1. When commiting to the remote repo, **make sure to run** `npm run clean` to make sure your code is formatted accurately. This is done so everyone follows the same formatting style. If not, you'll fail the formatting check :(
