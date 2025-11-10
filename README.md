# AI Sponsorship Checker

![AI Sponsorship Checker Logo](icons/icon128.png)

The **AI Sponsorship Checker** is a powerful Chrome extension designed to help job seekers quickly identify visa sponsorship information within job descriptions. Leveraging the Google Gemini AI, this tool scans job postings, provides a clear verdict on sponsorship availability, and highlights relevant keywords directly on the page.

## Features

*   **AI-Powered Analysis:** Uses the Google Gemini API to intelligently parse job descriptions for sponsorship-related terms.
*   **Clear Verdict:** Displays a clear and concise verdict: "Sponsorship Provided," "No Sponsorship," or "Not Mentioned."
*   **Keyword Highlighting:** Automatically highlights the exact phrases and keywords on the page that led to the AI's conclusion.
*   **Easy Setup:** A simple, one-time setup for your Gemini API key.
*   **Secure Storage:** Your API key is stored securely in your browser's local storage and is never transmitted to anyone other than Google.

## How It Works

The extension operates in three simple steps:

1.  **Scrape:** When activated, the extension's content script reads the visible text from the active browser tab.
2.  **Analyze:** The scraped text is sent to the Google Gemini API with a specialized prompt to analyze for sponsorship information. The AI returns a structured JSON object with a verdict and keywords.
3.  **Highlight:** The verdict is displayed in the extension's popup, and the identified keywords are sent back to the content script to be highlighted in red on the job description page.

## Setup

Before you can use the extension, you need to add your own Google Gemini API key.

1.  **Get a Gemini API Key:**
    *   Visit the [Google AI Studio](https://aistudio.google.com/).
    *   Sign in with your Google account.
    *   Click on **"Get API key"** and create a new API key in a new or existing project.
    *   Copy the generated API key to your clipboard.

2.  **Save the API Key in the Extension:**
    *   Click the AI Sponsorship Checker icon in your Chrome toolbar to open the popup.
    *   Paste your Gemini API key into the input field under "Gemini API Key Setup."
    *   Click the **"Save Key"** button. The status will update to "Saved (Ready)" when the key is successfully stored.

    ![Setup Screenshot](placeholder.png)
    *(Placeholder for a screenshot of the setup process)*

## Usage

1.  Navigate to a job description page (e.g., on LinkedIn, Indeed, or a company's career site).
2.  Click the AI Sponsorship Checker icon in your Chrome toolbar.
3.  Click the **"Analyze & Highlight Keywords"** button.
4.  The extension will display a loading message while it analyzes the page.
5.  Once complete, the popup will show the sponsorship verdict, and relevant keywords will be highlighted in bold red text on the page.

    ![Usage Screenshot](placeholder.png)
    *(Placeholder for a screenshot of the extension in action)*

## Technology

*   **Frontend:** HTML, CSS, JavaScript
*   **Browser API:** Chrome Extension Manifest V3 API
*   **AI:** Google Gemini API

---

*This is a simplified extension and is for demonstration purposes only. Always double-check job descriptions for official information.*
