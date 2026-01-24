// ==UserScript==
// @name         JPDB Daily Progress Tracker
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Track vocabulary progress day-to-day on jpdb.io
// @author       Gemini
// @match        https://jpdb.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const today = new Date().toISOString().split('T')[0];
    const STORAGE_KEY = 'jpdb_daily_progress';

    function getStoredData() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : { date: null, decks: {} };
    }

    function saveStats(deckMap) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            date: today,
            decks: deckMap
        }));
    }

    function parseCurrentDecks() {
        const deckMap = {};
        const deckNodes = document.querySelectorAll('.deck');

        deckNodes.forEach(node => {
            const titleLink = node.querySelector('.deck-title a');
            if (!titleLink) return;

            const deckName = titleLink.textContent.trim();
            const deckBody = node.querySelector('.deck-body');
            if (!deckBody) return;

            // Find the Vocabulary section
            // We look for a div that contains the text 'Vocabulary'
            const bodyDivs = Array.from(deckBody.querySelectorAll('div'));
            const vocabLabelDiv = bodyDivs.find(d => d.childNodes.length === 1 && d.textContent.trim() === 'Vocabulary');

            if (vocabLabelDiv && vocabLabelDiv.parentElement) {
                // The structure is usually: Parent > [Vocabulary Label, Numbers]
                const container = vocabLabelDiv.parentElement;
                const textContent = container.textContent || "";

                // Extracts the first number found after the word "Vocabulary"
                // This captures "50" from "50 / 110" or "7" from a simple list
                const match = textContent.match(/Vocabulary\s*(\d+)/);

                if (match && match[1]) {
                    deckMap[deckName] = parseInt(match[1]);
                }
            }
        });
        return deckMap;
    }

    function renderProgressHeader(currentDecks, storedDecks) {
        const container = document.querySelector('.container.bugfix');
        if (!container) return;

        const sidebar = document.createElement('div');
        sidebar.className = 'outline';
        sidebar.style.padding = '1rem';
        sidebar.style.marginBottom = '1.5rem';
        sidebar.style.border = '1px solid var(--outline-border)';
        sidebar.style.borderRadius = '4px';
        sidebar.style.backgroundColor = 'var(--background-color)';

        let html = `<h4 style="margin-top:0">Today's Progress</h4><ul style="list-style: none; padding: 0; margin: 0;">`;
        let hasChanges = false;

        // Compare current counts to stored start-of-day counts
        for (const [name, current] of Object.entries(currentDecks)) {
            if (storedDecks.hasOwnProperty(name)) {
                const startValue = storedDecks[name];
                const diff = current - startValue;

                if (diff > 0) {
                    hasChanges = true;
                    html += `<li style="margin-bottom: 0.25rem;">
                        <span style="color: #2ecc71; font-weight: bold;">+${diff}</span> — ${name}
                    </li>`;
                }
            }
        }

        if (!hasChanges) {
            html += `<li style="opacity: 0.6;">No vocabulary count increases detected yet today.</li>`;
        }

        html += `</ul>`;
        sidebar.innerHTML = html;

        // Insert after the title header
        const header = container.querySelector('h4');
        if (header) {
            header.after(sidebar);
        } else {
            container.prepend(sidebar);
        }
    }

    // MAIN LOGIC
    const state = getStoredData();
    const path = window.location.pathname;

    // 1. Redirect logic: If on homepage and day has changed
    if ((path === '/' || path === '') && state.date !== today) {
        window.location.href = '/deck-list';
        return;
    }

    // 2. Scan logic: On the deck-list page
    if (path === '/deck-list') {
        const currentData = parseCurrentDecks();

        if (state.date !== today) {
            // First time today: Save current snapshot as baseline
            saveStats(currentData);
            console.log("jpdb Tracker: Baseline snapshot for " + today + " saved.");
        } else {
            // Returning later: Show progress since snapshot
            renderProgressHeader(currentData, state.decks);
        }
    }

})();