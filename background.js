// --- CANVAS ENVIRONMENT VARIABLES (MANDATORY TO INCLUDE) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// The 'apiKey' is now fetched from storage.
const apiKeyEnv = "";
// -----------------------------------------------------------

const apiUrlBase = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";


/**
 * Schema for Sponsorship Analysis and Highlighting.
 */
const HIGHLIGHT_SCHEMA = {
    type: "OBJECT",
    properties: {
        "sponsorshipStatus": {
            "type": "STRING",
            "description": "Must be one of: 'No Sponsorship', 'Sponsorship Provided', or 'Not Mentioned'."
        },
        "highlightSnippets": {
            "type": "ARRAY",
            "description": "A list of exact text snippets (max 5 words each) found that clearly indicate the status, for highlighting purposes. E.g., ['not sponsor visa', 'E-Verify required', 'US citizens only'].",
            "items": { "type": "STRING" }
        }
    },
    required: ["sponsorshipStatus", "highlightSnippets"]
};


/**
 * Retries a fetch request with exponential backoff.
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Fetch attempt ${i + 1}/${maxRetries} to: ${url}`);
            const response = await fetch(url, options);
            if (response.status !== 429) { // Not a rate limit error
                return response;
            }
            console.warn(`Rate limit encountered (429). Retrying in ${2 ** i}s...`);
            lastError = new Error(`Rate limit (429) on attempt ${i + 1}`);
        } catch (error) {
            lastError = error;
            console.error(`Fetch attempt ${i + 1} failed:`, error.message);
        }
        if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, (2 ** i) * 1000));
        }
    }
    const errorMsg = lastError ? lastError.message : "Unknown error";
    throw new Error(`Failed to fetch from API after ${maxRetries} retries. Last error: ${errorMsg}`);
}


/**
 * Calls Gemini to analyze the job description text for sponsorship information.
 * @param {string} jdText - The full job description text.
 * @returns {Promise<Object>} The structured sponsorship analysis result, including snippets to highlight.
 */
async function analyzeJobDescription(jdText) {
    const storage = await chrome.storage.local.get('geminiApiKey');
    const apiKey = storage.geminiApiKey;

    if (!apiKey) {
        throw new Error("API Key not found. Please set your key in the extension popup.");
    }

    const userPrompt = `Analyze the following job description text for information regarding visa sponsorship, work authorization, or citizenship requirements.

    1. Determine the sponsorship status: 'No Sponsorship', 'Sponsorship Provided', or 'Not Mentioned'.
    2. Extract a list of exact, short text snippets (max 5 words each) that justify the status. These snippets will be used to highlight the text directly on the page.

    Job Description Text:
    ---
    ${jdText.substring(0, 8000)}
    ---
    `; // Limit text to 8000 chars to prevent token overflow.

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: HIGHLIGHT_SCHEMA
        }
    };

    const apiUrl = `${apiUrlBase}?key=${apiKey}`;

    const response = await fetchWithRetry(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Sponsorship API call failed with status ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!jsonText) {
        console.error("AI Sponsorship Response Details:", result);
        throw new Error("AI analysis failed to return a valid JSON object.");
    }

    return JSON.parse(jsonText);
}


// Listener for messages from the Popup (runs in the Service Worker)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Action: Proactive Sponsorship Analysis (from popup.js)
    if (request.action === "ANALYZE_SPONSORSHIP") {
        (async () => {
            try {
                if (!request.jdText || request.jdText.trim().length === 0) {
                    throw new Error("Job description text is empty.");
                }

                const analysisResult = await analyzeJobDescription(request.jdText);
                console.log("Sponsorship Analysis Result:", analysisResult);

                sendResponse({ status: 'success', result: analysisResult });
            } catch (error) {
                console.error("Background script (Sponsorship Analysis) failure:", error.message);
                sendResponse({ status: 'error', error: error.message });
            }
        })();
        return true;
    }

    // Fallback for unknown actions
    console.warn("Unknown action received:", request.action);
    return false;
});
