// ==UserScript==
// @name         jpdb Daily Progress Tracker (V1.7 - Deck Count Header)
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Track Known+Learning for Kanji/Vocab with smart list filtering and deck counts
// @author       Gemini
// @match        https://jpdb.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const today = new Date().toISOString().split('T')[0];

    // DO NOT INCREMENT THE STORAGE KEY VERSION UNLESS THE SCHEMA ACTUALLY CHANGES!
    // Changing this key will wipe the user's progress history for the current day.
    const STORAGE_KEY = 'jpdb_daily_tracker_v1_5';

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

    // --- PARSING LOGIC ---
    function parseDeckList() {
        const deckMap = {};
        const deckNodes = document.querySelectorAll('.deck');

        deckNodes.forEach(node => {
            const titleLink = node.querySelector('.deck-title a');
            if (!titleLink) return;
            // Trim whitespace, but keep full name for parsing
            const deckName = titleLink.textContent.trim();

            deckMap[deckName] = { vocab: 0, kanji: 0 };

            const deckBody = node.querySelector('.deck-body');
            if (!deckBody) return;

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

                // 1. Get Total
                const numbersDiv = rowHeader.lastElementChild;
                const numbersText = numbersDiv ? numbersDiv.textContent : "";
                const totalMatch = numbersText.match(/\/\s*(\d+)/);
                if (!totalMatch) return;

                const totalCount = parseInt(totalMatch[1]);

                // 2. Get New %
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
        box.style.cssText = 'padding: 1rem; margin-bottom: 1.5rem; border: 1px solid var(--outline-border); border-radius: 4px; background: var(--background-color);';

        let changedRows = [];
        let unchangedRows = [];
        let affectedDeckCount = 0;

        // Helper to truncate text
        const truncate = (str, n) => {
            return (str.length > n) ? str.slice(0, n-1) + '&hellip;' : str;
        };

        for (const [name, currentCounts] of Object.entries(current)) {
            const baseCounts = stored[name] || { vocab: currentCounts.vocab, kanji: currentCounts.kanji };

            const vDiff = Math.max(0, currentCounts.vocab - baseCounts.vocab);
            const kDiff = Math.max(0, currentCounts.kanji - baseCounts.kanji);

            // Skip empty tracking rows
            if (currentCounts.vocab === 0 && currentCounts.kanji === 0) continue;

            const hasChange = vDiff > 0 || kDiff > 0;

            const vColor = vDiff > 0 ? 'var(--state-known)' : 'inherit';
            const kColor = kDiff > 0 ? '#3498db' : 'inherit';
            const vWeight = vDiff > 0 ? 'bold' : 'normal';
            const kWeight = kDiff > 0 ? 'bold' : 'normal';
            const rowOpacity = hasChange ? '1' : '0.6';

            // Truncate name for display only
            const displayName = truncate(name, 60);

            const rowHtml = `
                <tr style="border-bottom: 1px solid var(--outline-border); opacity: ${rowOpacity}">
                    <td style="padding: 0.4rem 4px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${name}">${displayName}</td>
                    <td style="text-align: right; padding: 0.4rem 8px; font-size:0.9em; min-width: 140px;">
                        <span style="opacity:0.7">Voc:</span> ${currentCounts.vocab} <span style="opacity:0.4">|</span> <span style="opacity:0.7">Kan:</span> ${currentCounts.kanji}
                    </td>
                    <td style="text-align: right; padding: 0.4rem 4px; white-space: nowrap; min-width: 90px;">
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
                // Count legitimate review decks, ignore the "All vocabulary" aggregate deck
                if (name !== 'All vocabulary') {
                    affectedDeckCount++;
                }
            } else {
                unchangedRows.push(rowHtml);
            }
        }

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
            mainContent = `<tr><td colspan="3" style="padding:1rem; text-align:center; opacity:0.6;">No progress recorded yet today. Time to learn!</td></tr>`;
            if (unchangedRows.length > 0) {
                footerToggle = `
                    <div style="text-align:center; padding-top:0.5rem; font-size:0.85em; opacity:0.7; cursor:pointer; text-decoration:underline;" 
                         onclick="document.getElementById('jpdb-tracker-hidden-rows').style.display = document.getElementById('jpdb-tracker-hidden-rows').style.display === 'none' ? 'table-row-group' : 'none'; this.textContent = this.textContent.includes('Show') ? 'Hide totals' : 'Show current totals';">
                        Show current totals
                    </div>
                `;
            }
        }

        const statsText = (affectedDeckCount === 1) ? "across 1 deck" : `across ${affectedDeckCount} decks`;

        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4 style="margin:0">Today's Progress <small style="font-weight:normal; opacity:0.7; font-size:0.8em">${statsText}</small></h4>
            </div>
            ${tableHeader}
            ${mainContent}
            ${hiddenContentStart}
            ${unchangedRows.join('')}
            ${hiddenContentEnd}
            </table>
            ${footerToggle}
        `;

        const niceHeader = Array.from(container.querySelectorAll('h4')).find(h => h.textContent.includes('Your decks'));
        if (niceHeader) {
            niceHeader.after(box);
        } else {
            container.prepend(box);
        }
    }

    // --- MAIN ---
    const state = getStoredData();
    const path = window.location.pathname;

    if ((path === '/' || path === '') && state.date !== today) {
        window.location.href = '/deck-list';
        return;
    }

    if (path === '/deck-list') {
        try {
            const currentData = parseDeckList();
            if (state.date !== today) {
                saveStats(currentData);
                console.log("jpdb Tracker: Baseline reset for " + today);
                renderDisplay(currentData, currentData);
            } else {
                renderDisplay(currentData, state.decks);
            }
        } catch (e) {
            console.error("jpdb Tracker Error:", e);
        }
    }

})();