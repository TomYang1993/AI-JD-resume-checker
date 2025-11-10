/**
 * Simplified Content Script: Scrapes JD text and highlights sponsorship keywords.
 */

/**
 * Scrapes all visible text content from the body of the document.
 * @returns {string} The raw text content of the page.
 */
function scrapeJobDescription() {
    // document.body.innerText is generally best for preserving line breaks and excluding hidden text.
    return document.body.innerText;
}

/**
 * Traverses the DOM and highlights exact keyword matches in red.
 * This function needs to be resilient to avoid breaking the page's layout.
 * @param {string[]} keywords - List of exact text snippets to highlight.
 */
function highlightKeywords(keywords) {
    if (!keywords || keywords.length === 0) {
        console.log("No keywords to highlight.");
        return;
    }

    const keywordsRegex = new RegExp(`(${keywords.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`, 'gi');

    // Use a TreeWalker to safely traverse only text nodes
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const nodesToReplace = [];
    let node;

    // 1. Collect all eligible text nodes that contain a keyword
    while (node = walker.nextNode()) {
        if (node.parentElement && node.parentElement.tagName !== 'SCRIPT' && node.parentElement.tagName !== 'STYLE') {
            if (keywordsRegex.test(node.nodeValue)) {
                nodesToReplace.push(node);
            }
        }
    }

    // 2. Perform replacement on collected nodes
    nodesToReplace.forEach(textNode => {
        const content = textNode.nodeValue;

        // Split the text content by the keyword regex
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        content.replace(keywordsRegex, (match, offset) => {
            // Append the text before the match
            if (offset > lastIndex) {
                fragment.appendChild(document.createTextNode(content.substring(lastIndex, offset)));
            }

            // Create the highlighted span
            const span = document.createElement('span');
            span.style.backgroundColor = 'transparent';
            span.style.color = '#dc2626'; /* Tailwind red-600 equivalent */
            span.style.fontWeight = 'bold';
            span.style.boxShadow = '0 0 1px #dc2626';
            span.textContent = match;
            fragment.appendChild(span);

            lastIndex = offset + match.length;
        });

        // Append remaining text after the last match
        if (lastIndex < content.length) {
            fragment.appendChild(document.createTextNode(content.substring(lastIndex)));
        }

        // Replace the original text node with the fragment
        textNode.parentNode.replaceChild(fragment, textNode);
    });

    console.log(`Successfully highlighted ${keywords.length} keywords.`);
}


// Listener for messages from the Background Service Worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Action 1: Handle request from popup to scrape JD text
    if (request.action === "SCRAPE_JD") {
        const jdText = scrapeJobDescription();
        // Send the scraped text back to the popup/background
        sendResponse({ jdText: jdText });
        return true;
    }

    // Action 2: Receive keywords from the background script to highlight
    else if (request.action === "HIGHLIGHT_KEYWORDS" && request.keywords) {
        highlightKeywords(request.keywords);
    }
});
