// Constants for UI elements
const sponsorshipButton = document.getElementById('sponsorshipButton');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');

const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyButton = document.getElementById('saveKeyButton');
const keyStatusSpan = document.getElementById('keyStatus');
const keyMessageDiv = document.getElementById('keyMessage');

const sponsorshipResultDiv = document.getElementById('sponsorshipResult');
const sponsorshipVerdictSpan = document.getElementById('sponsorshipVerdict');


const HIDE_ALL_MESSAGES = () => {
    [loadingMessage, sponsorshipResultDiv, errorMessage, keyMessageDiv].forEach(el => el.style.display = 'none');
};

/**
 * Loads the current API key status from storage and updates the UI.
 */
async function loadApiKeyStatus() {
    const result = await chrome.storage.local.get('geminiApiKey');
    if (result.geminiApiKey) {
        keyStatusSpan.textContent = 'Saved (Ready)';
        keyStatusSpan.className = 'key-status-ok';
        apiKeyInput.value = '**********' + result.geminiApiKey.slice(-4);

        sponsorshipButton.disabled = false;
        sponsorshipButton.style.opacity = 1;

    } else {
        keyStatusSpan.textContent = 'Missing';
        keyStatusSpan.className = 'key-status-missing';

        sponsorshipButton.disabled = true;
        sponsorshipButton.style.opacity = 0.5;
    }
}

/**
 * Saves the key from the input field to Chrome storage.
 */
saveKeyButton.addEventListener('click', async () => {
    HIDE_ALL_MESSAGES();
    const key = apiKeyInput.value.trim();

    if (key.startsWith('**********')) {
        keyMessageDiv.textContent = "Key is already saved.";
        keyMessageDiv.className = 'message success';
        keyMessageDiv.style.display = 'block';
        return;
    }

    if (key.length < 10) {
        keyMessageDiv.textContent = "Please enter a valid API key.";
        keyMessageDiv.className = 'message error';
        keyMessageDiv.style.display = 'block';
        return;
    }

    await chrome.storage.local.set({ geminiApiKey: key });
    await loadApiKeyStatus();

    keyMessageDiv.textContent = "API Key saved successfully!";
    keyMessageDiv.className = 'message success';
    keyMessageDiv.style.display = 'block';
});

/**
 * Event listener for the Sponsorship Check button.
 */
sponsorshipButton.addEventListener('click', async () => {
    HIDE_ALL_MESSAGES();

    if (sponsorshipButton.disabled) {
        errorMessage.textContent = "Error: Please save your Gemini API Key first.";
        errorMessage.style.display = 'block';
        return;
    }

    loadingMessage.style.display = 'block';
    sponsorshipButton.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            throw new Error("No active tab found.");
        }

        // Check for restricted pages where content.js cannot run
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('file://')) {
            throw new Error("Cannot analyze restricted Chrome pages. Please navigate to a job description page.");
        }

        // STEP 1: Inject content script if not already present, then send message to scrape JD text
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            console.log("Content script injected successfully.");
        } catch (injectError) {
            console.warn("Could not inject content script (may already be present):", injectError);
        }

        // Give the content script a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Now send the message to scrape JD
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: "SCRAPE_JD"
        }).catch(err => {
            console.error("Failed to send SCRAPE_JD message:", err);
            throw new Error("The extension cannot access this page. Try refreshing the page and try again.");
        });

        if (response && response.jdText) {
            // STEP 2: Send the scraped text to the background for AI analysis
            const aiResponse = await chrome.runtime.sendMessage({
                action: "ANALYZE_SPONSORSHIP",
                jdText: response.jdText
            }).catch(err => {
                console.error("Failed to send ANALYZE_SPONSORSHIP message:", err);
                throw new Error("Background service worker error. Try refreshing the extension.");
            });

            if (aiResponse.status === 'success') {
                // STEP 3: Display status and send keywords back to content.js for highlighting
                displaySponsorshipResult(aiResponse.result);
                await chrome.tabs.sendMessage(tab.id, {
                    action: "HIGHLIGHT_KEYWORDS",
                    keywords: aiResponse.result.highlightSnippets
                }).catch(err => {
                    console.warn("Could not send highlight message:", err);
                    // Don't fail here - highlighting is secondary
                });

            } else {
                throw new Error(aiResponse.error || "AI analysis failed.");
            }
        } else {
            throw new Error("Could not scrape job description text from the page. (Page body may be empty)");
        }
    } catch (e) {
        console.error("Sponsorship check failed:", e);
        HIDE_ALL_MESSAGES();
        errorMessage.textContent = `Error: ${e.message}`;
        errorMessage.style.display = 'block';
    } finally {
        sponsorshipButton.disabled = false;
        loadingMessage.style.display = 'none';
        loadApiKeyStatus(); // Re-enable if key is present
    }
});

/**
 * Displays the result from the AI sponsorship analysis in the popup.
 * @param {Object} result
 */
function displaySponsorshipResult(result) {
    const status = result.sponsorshipStatus || 'Not Mentioned';

    sponsorshipResultDiv.style.display = 'block';
    sponsorshipVerdictSpan.textContent = status;

    // Set colors and classes based on status
    sponsorshipResultDiv.classList.remove('status-no', 'status-yes', 'status-uncertain');

    if (status.includes('No Sponsorship')) {
        sponsorshipResultDiv.classList.add('status-no');
    } else if (status.includes('Sponsorship Provided')) {
        sponsorshipResultDiv.classList.add('status-yes');
    } else {
        sponsorshipResultDiv.classList.add('status-uncertain');
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadApiKeyStatus);
