// ==UserScript==
// @name         JPDB Review Transcriber
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Extract vocabulary data from JPDB review answer pages and save to local server
// @author       You
// @match        https://jpdb.io/review*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    const SERVER_URL = 'http://localhost:3000/save';
    const DEBUG = true;

    function log(message, ...args) {
        if (DEBUG) {
            console.log('[JPDB Transcriber]', message, ...args);
        }
    }

    function showWarning(message) {
        // Remove any existing warning
        const existing = document.getElementById('jpdb-transcriber-warning');
        if (existing) {
            existing.remove();
        }

        // Create warning banner
        const warning = document.createElement('div');
        warning.id = 'jpdb-transcriber-warning';
        warning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff6b6b;
            color: white;
            padding: 12px 20px;
            text-align: center;
            font-family: sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        warning.textContent = message;

        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.textContent = ' ✕';
        closeBtn.style.cssText = `
            cursor: pointer;
            margin-left: 10px;
            opacity: 0.8;
        `;
        closeBtn.onclick = () => warning.remove();
        warning.appendChild(closeBtn);

        document.body.appendChild(warning);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (warning.parentNode) {
                warning.remove();
            }
        }, 10000);
    }

    function isAnswerPage() {
        // Check if we're on an answer page by looking for the answer reveal div
        const answerDiv = document.querySelector('.review-reveal');
        const hasHashA = window.location.hash === '#a';

        return answerDiv !== null || hasHashA;
    }

    function extractVocabularyData() {
        const data = {
            url: window.location.href,
            word: null,
            reading: null,
            meanings: {}
        };

        // Extract the word and reading from the answer box
        const linkElement = document.querySelector('.answer-box .plain a.plain');
        if (linkElement) {
            const rubyElements = linkElement.querySelectorAll('ruby');

            if (rubyElements.length > 0) {
                // Case 1: Word has ruby tags (kanji with furigana)
                // Handle multiple ruby tags (e.g., 写生 has two separate ruby elements)
                let word = '';
                let reading = '';

                rubyElements.forEach(ruby => {
                    // Get the kanji/word (text nodes before <rt>)
                    const kanji = ruby.childNodes[0]?.textContent?.trim() || '';
                    word += kanji;

                    // Get the reading from <rt> tag if present
                    const rtElement = ruby.querySelector('rt');
                    if (rtElement) {
                        reading += rtElement.textContent.trim();
                    } else {
                        // If no <rt> tag, the ruby element contains plain kana (okurigana)
                        // which should also be part of the reading
                        reading += kanji;
                    }
                });

                data.word = word;
                data.reading = reading || null;
            } else {
                // Case 2: Word has no ruby tags (already in kana or no furigana needed)
                data.word = linkElement.textContent.trim();
                data.reading = null; // No separate reading available
            }
        }

        // Extract meanings organized by grammar terms
        const meaningsSection = document.querySelector('.subsection-meanings .subsection');
        if (meaningsSection) {
            let currentGrammarTerms = null;

            // Iterate through all children of the subsection
            Array.from(meaningsSection.children).forEach(child => {
                if (child.classList.contains('part-of-speech')) {
                    // Extract all grammar terms from this part-of-speech div
                    const terms = Array.from(child.children).map(div => div.textContent.trim());
                    currentGrammarTerms = terms.join(', ');

                    // Initialize array for this grammar term group if not exists
                    if (currentGrammarTerms && !data.meanings[currentGrammarTerms]) {
                        data.meanings[currentGrammarTerms] = [];
                    }
                } else if (child.classList.contains('description') && currentGrammarTerms) {
                    // Extract only the direct text content, not nested divs (like "orig. meaning" notes)
                    let meaningText = '';
                    for (const node of child.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            meaningText += node.textContent;
                        }
                    }
                    meaningText = meaningText.trim();

                    // Remove numbering (e.g., "1. " or "2. ")
                    const cleanedMeaning = meaningText.replace(/^\d+\.\s*/, '');

                    if (cleanedMeaning) {
                        data.meanings[currentGrammarTerms].push(cleanedMeaning);
                    }
                }
            });
        }

        return data;
    }

    function captureAndSend() {
        if (!isAnswerPage()) {
            log('Not an answer page, skipping...');
            return;
        }

        // Extract vocabulary data
        const vocabularyData = extractVocabularyData();

        // Check if we actually got data
        if (!vocabularyData.word) {
            log('No vocabulary data found, skipping...');
            return;
        }

        log('Capturing vocabulary data...');
        log('Word:', vocabularyData.word);
        log('Reading:', vocabularyData.reading);
        log('Meanings:', vocabularyData.meanings);

        // Convert to JSON string for sending
        const jsonData = JSON.stringify(vocabularyData, null, 2);

        // Send to server using GM_xmlhttpRequest (to bypass CORS)
        GM_xmlhttpRequest({
            method: 'POST',
            url: SERVER_URL,
            data: jsonData,
            headers: {
                'Content-Type': 'application/json'
            },
            onload: function(response) {
                log('Successfully saved to server:', response.responseText);
                try {
                    const result = JSON.parse(response.responseText);
                    log('Timestamp:', result.timestamp);
                } catch (e) {
                    log('Response:', response.responseText);
                }
            },
            onerror: function(error) {
                console.error('[JPDB Transcriber] Error saving to server:', error);
                showWarning('⚠️ JPDB Transcriber: Cannot connect to storage server at localhost:3000');
            },
            ontimeout: function() {
                console.error('[JPDB Transcriber] Timeout connecting to server');
                showWarning('⚠️ JPDB Transcriber: Connection to storage server timed out');
            }
        });
    }

    // Initial check when page loads
    function initialize() {
        log('Userscript initialized');
        log('Current URL:', window.location.href);

        // Wait a bit for the page to fully load
        setTimeout(() => {
            captureAndSend();
        }, 500);
    }

    // Listen for hash changes (when user navigates between questions/answers)
    window.addEventListener('hashchange', function() {
        log('Hash changed to:', window.location.hash);
        setTimeout(() => {
            captureAndSend();
        }, 300);
    });

    // Listen for when the answer is revealed (show answer button clicked)
    const observer = new MutationObserver(function(mutations) {
        const answerRevealed = document.querySelector('.review-reveal');
        if (answerRevealed) {
            log('Answer revealed detected via mutation observer');
            captureAndSend();
            // Disconnect after first capture to avoid duplicate captures
            observer.disconnect();
        }
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    log('JPDB Review Transcriber loaded');
})();
