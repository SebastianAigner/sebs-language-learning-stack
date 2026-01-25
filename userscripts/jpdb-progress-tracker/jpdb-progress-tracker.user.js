// ==UserScript==
// @name         jpdb Daily Progress Tracker (Smart Filter V1.5)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Track Known+Learning for Kanji/Vocab with smart list filtering
// @author       Gemini
// @match        https://jpdb.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const today = new Date().toISOString().split('T')[0];
    const STORAGE_KEY = 'jpdb_daily_tracker_v1_5'; // New key ensures clean slate for new layout logic

    // --- STORAGE HELPERS ---
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

    // --- PARSING LOGIC (Robust V1.4 Logic) ---
    function parseDeckList() {
        const deckMap = {};
        const deckNodes = document.querySelectorAll('.deck');

        deckNodes.forEach(node => {
            const titleLink = node.querySelector('.deck-title a');
            if (!titleLink) return;
            const deckName = titleLink.textContent.trim();

            deckMap[deckName] = { vocab: 0, kanji: 0 };

            const deckBody = node.querySelector('.deck-body');
            if (!deckBody) return;

            // Iterate over labels "Vocabulary" or "Kanji"
            const labels = Array.from(deckBody.querySelectorAll('div'));

            labels.forEach(label => {
                const text = label.textContent.trim();
                const isVocab = text === 'Vocabulary';
                const isKanji = text === 'Kanji';

                if (!isVocab && !isKanji) return;

                const rowHeader = label.parentElement;
                if (!rowHeader) return;
                const statContainer = rowHeader.parentElement;
                if (!statContainer) return;

                // 1. Get Total (e.g. "48 / 111")
                const numbersDiv = rowHeader.lastElementChild;
                const numbersText = numbersDiv ? numbersDiv.textContent : "";
                const totalMatch = numbersText.match(/\/\s*(\d+)/);
                if (!totalMatch) return;

                const totalCount = parseInt(totalMatch[1]);

                // 2. Get New % (Using tooltip)
                const newTooltip = statContainer.querySelector('[data-tooltip*="New:"]');
                let newCount = 0;

                if (newTooltip) {
                    const tipText = newTooltip.getAttribute('data-tooltip');
                    const pctMatch = tipText.match(/New:\s*([\d.]+)%/);
                    if (pctMatch) {
                        const pct = parseFloat(pctMatch[1]);
                        newCount = Math.round(totalCount * (pct / 100));
                    }
                } else {
                    // Check if *any* progress bar exists. If yes but no "New", deck is done (New=0).
                    // If no bars exist (static list), treat New=0.
                    newCount = 0;
                }

                const effectiveProgress = totalCount - newCount;

                if (isVocab) deckMap[deckName].vocab = effectiveProgress;
                if (isKanji) deckMap[deckName].kanji = effectiveProgress;
            });
        });

        return deckMap;
    }

    // --- DISPLAY LOGIC ---
    function renderDisplay(current, stored) {
        const container = document.querySelector('.container.bugfix');
        if (!container) return;

        const oldBox = document.getElementById('jpdb-progress-tracker-box');
        if(oldBox) oldBox.remove();

        const box = document.createElement('div');
        box.id = 'jpdb-progress-tracker-box';
        box.className = 'outline';
        // Using var(--background-color) matches user's dark/light mode preference
        box.style.cssText = 'padding: 1rem; margin-bottom: 1.5rem; border: 1px solid var(--outline-border); border-radius: 4px; background: var(--background-color);';

        // --- Build Rows ---
        let changedRows = []; // Stores HTML for decks with progress
        let unchangedRows = []; // Stores HTML for decks with 0 change

        for (const [name, currentCounts] of Object.entries(current)) {
            // Get yesterday/start-of-day baseline
            const baseCounts = stored[name] || { vocab: currentCounts.vocab, kanji: currentCounts.kanji };

            // Calculate absolute difference. Use 0 if logic results in negative (rare edge case, usually deck total changed)
            const vDiff = Math.max(0, currentCounts.vocab - baseCounts.vocab);
            const kDiff = Math.max(0, currentCounts.kanji - baseCounts.kanji);

            // Skip completely empty decks
            if (currentCounts.vocab === 0 && currentCounts.kanji === 0) continue;

            const hasChange = vDiff > 0 || kDiff > 0;

            const vColor = vDiff > 0 ? 'var(--state-known)' : 'inherit';
            const kColor = kDiff > 0 ? '#3498db' : 'inherit';
            const vWeight = vDiff > 0 ? 'bold' : 'normal';
            const kWeight = kDiff > 0 ? 'bold' : 'normal';
            const rowOpacity = hasChange ? '1' : '0.6';

            // HTML for a single row
            const rowHtml = `
                <tr style="border-bottom: 1px solid var(--outline-border); opacity: ${rowOpacity}">
                    <td style="padding: 0.4rem 4px;">${name}</td>
                    <td style="text-align: right; padding: 0.4rem 8px; font-size:0.9em">
                        <span style="opacity:0.7">Voc:</span> ${currentCounts.vocab} <span style="opacity:0.4">|</span> <span style="opacity:0.7">Kan:</span> ${currentCounts.kanji}
                    </td>
                    <td style="text-align: right; padding: 0.4rem 4px; white-space: nowrap;">
                        <span style="color:${vColor}; font-weight:${vWeight}; margin-right:8px;">
                            ${vDiff > 0 ? '+' + vDiff : '-'} <small style="opacity:0.7">V</small>
                        </span>
                        <span style="color:${kColor}; font-weight:${kWeight};">
                            ${kDiff > 0 ? '+' + kDiff : '-'} <small style="opacity:0.7">K</small>
                        </span>
                    </td>
                </tr>`;

            if (hasChange) {
                changedRows.push(rowHtml);
            } else {
                unchangedRows.push(rowHtml);
            }
        }

        // --- Assemble Table HTML ---

        let tableHeader = `
            <table id="jpdb-tracker-table" style="width:100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.95rem;">
            <tr style="opacity: 0.6; border-bottom: 2px solid var(--outline-border); font-size: 0.85em;">
                <th style="text-align:left; padding: 4px;">Deck</th>
                <th style="text-align:right; padding: 4px;">Current Totals</th>
                <th style="text-align:right; padding: 4px;">Daily Gain</th>
            </tr>
        `;

        let mainContent = '';
        let hiddenContentStart = `<tbody id="jpdb-tracker-hidden-rows" style="display:none">`;
        let hiddenContentEnd = `</tbody>`;
        let footerToggle = '';

        if (changedRows.length > 0) {
            // Case 1: We have progress. Show it. Hide the rest.
            mainContent = changedRows.join('');
            if (unchangedRows.length > 0) {
                footerToggle = `
                    <div style="text-align:center; padding-top:0.5rem; font-size:0.85em; opacity:0.7; cursor:pointer; text-decoration:underline;"
                         onclick="document.getElementById('jpdb-tracker-hidden-rows').style.display = document.getElementById('jpdb-tracker-hidden-rows').style.display === 'none' ? 'table-row-group' : 'none'; this.textContent = this.textContent.includes('Show') ? 'Hide unchanged decks' : 'Show all decks';">
                        Show all decks (${unchangedRows.length} hidden)
                    </div>
                `;
            }
        } else {
            // Case 2: No progress anywhere yet today.
            mainContent = `<tr><td colspan="3" style="padding:1rem; text-align:center; opacity:0.6;">No progress recorded yet today. Time to learn!</td></tr>`;
            // Put everything into the hidden block so they can see totals if they really want to
            if (unchangedRows.length > 0) {
                footerToggle = `
                    <div style="text-align:center; padding-top:0.5rem; font-size:0.85em; opacity:0.7; cursor:pointer; text-decoration:underline;"
                         onclick="document.getElementById('jpdb-tracker-hidden-rows').style.display = document.getElementById('jpdb-tracker-hidden-rows').style.display === 'none' ? 'table-row-group' : 'none'; this.textContent = this.textContent.includes('Show') ? 'Hide totals' : 'Show current totals';">
                        Show current totals
                    </div>
                `;
            }
        }

        // Final HTML assembly
        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4 style="margin:0">Today's Progress <small style="font-weight:normal; opacity:0.7; font-size:0.8em">(Known + Learning)</small></h4>
            </div>
            ${tableHeader}
            ${mainContent}
            ${hiddenContentStart}
            ${unchangedRows.join('')}
            ${hiddenContentEnd}
            </table>
            ${footerToggle}
        `;

        // Insert into DOM
        const niceHeader = Array.from(container.querySelectorAll('h4')).find(h => h.textContent.includes('Your decks'));
        if (niceHeader) {
            niceHeader.after(box);
        } else {
            container.prepend(box);
        }
    }

    // --- MAIN EXECUTION ---
    const state = getStoredData();
    const path = window.location.pathname;

    // 1. Force Scan on First Visit
    if ((path === '/' || path === '') && state.date !== today) {
        window.location.href = '/deck-list';
        return;
    }

    // 2. Logic on Deck List
    if (path === '/deck-list') {
        try {
            const currentData = parseDeckList();

            // If new day, save baseline.
            if (state.date !== today) {
                saveStats(currentData);
                console.log("jpdb Tracker: Baseline reset for " + today);
                // Render comparing to itself (will show 0 gains, but allow user to toggle 'Show Totals')
                renderDisplay(currentData, currentData);
            } else {
                // Same day: compare current scan vs start-of-day scan
                renderDisplay(currentData, state.decks);
            }
        } catch (e) {
            console.error("jpdb Tracker Error:", e);
        }
    }

})();