// ==UserScript==
// @name         JPDB Hide Low Frequency Kanji Readings
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Hides kanji readings below 98% frequency on jpdb.io review pages and plays TTS for single readings
// @match        https://jpdb.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let lastPlayedReading = null;
    let audioElement = null;

    function playTTS(text) {
        // Format: …{reading}。(Japanese ellipsis prefix and Japanese period suffix)
        const formattedText = `…${text}。`;
        const url = `http://localhost:5065/tts?text=${encodeURIComponent(formattedText)}`;

        // Stop any currently playing audio
        if (audioElement) {
            audioElement.pause();
            audioElement = null;
        }

        audioElement = new Audio(url);
        audioElement.play().catch(err => {
            console.log('TTS playback failed:', err);
        });
    }

    function hideUncommonReadings() {
        if (!document.title.includes('Review')) {
            lastPlayedReading = null;
            return;
        }

        const readingLists = document.querySelectorAll('.kanji-reading-list-common');
        let visibleReadings = [];

        readingLists.forEach(list => {
            const readings = list.children;

            for (const reading of readings) {
                const percentageDiv = reading.querySelector('div[style*="margin-left"]');
                if (percentageDiv) {
                    const match = percentageDiv.textContent.match(/\((\d+)%\)/);
                    if (match) {
                        const percentage = parseInt(match[1], 10);
                        if (percentage < 98) {
                            reading.style.display = 'none';
                        } else {
                            reading.style.display = '';
                            // Extract the reading text from the <a> tag
                            const readingLink = reading.querySelector('a');
                            if (readingLink) {
                                const readingText = readingLink.textContent.trim();
                                if (readingText) {
                                    visibleReadings.push(readingText);
                                }
                            }
                        }
                    }
                } else {
                    // No percentage div, keep it visible
                    reading.style.display = '';
                }
            }
        });

        // Play TTS if exactly one reading is visible and it's different from what we last played
        if (visibleReadings.length === 1) {
            const readingToPlay = visibleReadings[0];
            if (readingToPlay !== lastPlayedReading) {
                lastPlayedReading = readingToPlay;
                playTTS(readingToPlay);
            }
        } else {
            lastPlayedReading = null;
        }
    }

    // Run on page load
    hideUncommonReadings();

    // Also run on dynamic content changes (for SPA navigation)
    const observer = new MutationObserver(hideUncommonReadings);
    observer.observe(document.body, { childList: true, subtree: true });
})();