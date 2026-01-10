// ==UserScript==
// @name         JPDB Show Absolute New Counts
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Display absolute count of new vocabulary and kanji items remaining in JPDB deck progress bars
// @author       Your Name
// @match        https://jpdb.io/learn
// @match        https://jpdb.io/deck-list
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Function to add new item counts to progress bars
    function addNewItemCounts() {
        // Find all deck bodies that contain progress information
        const deckBodies = document.querySelectorAll('.deck-body');

        deckBodies.forEach(deckBody => {
            // Find all progress bar containers within this deck
            const progressContainers = deckBody.querySelectorAll('[style*="display: flex;gap: 0.3rem;align-items: baseline;flex-direction: column;align-items: end;"]');

            progressContainers.forEach(container => {
                // Get the label (Vocabulary or Kanji) and count text
                const labelDiv = container.querySelector('[style*="opacity: 0.6;display: flex;flex-direction: row;width: 100%;justify-content: space-between;"]');
                if (!labelDiv) return;

                const labelText = labelDiv.textContent.trim();

                // Only process Vocabulary and Kanji rows (not Coverage)
                if (!labelText.includes('Vocabulary') && !labelText.includes('Kanji')) return;

                // Extract total count from the format "Known / Total" (e.g., "26 / 125")
                const countMatch = labelText.match(/(\d+)\s*\/\s*(\d+)/);
                if (!countMatch) return;

                const totalCount = parseInt(countMatch[2], 10);

                // Find the progress bar grid
                const progressBar = container.querySelector('[style*="background-color: var(--progress-bar-background);min-height: 0.5rem;width: 100%;border-radius: 4px;display: grid;"]');
                if (!progressBar) return;

                // Look for a "New:" tooltip to see if this deck has new items
                const newTooltip = progressBar.querySelector('[data-tooltip*="New:"]');
                if (!newTooltip) return;

                // Extract the new percentage from the tooltip
                const tooltipText = newTooltip.getAttribute('data-tooltip');
                const newPercentMatch = tooltipText.match(/New:\s*([\d.]+)%/);
                if (!newPercentMatch) return;

                const newPercent = parseFloat(newPercentMatch[1]);
                const absoluteNewCount = Math.round(totalCount * newPercent / 100);

                // Find the percentage text div (z-index: 2)
                const percentDiv = progressBar.querySelector('[style*="z-index: 2;"][style*="font-weight: bold;"]');
                if (!percentDiv) return;

                // Check if we've already added the count (to avoid duplicates)
                if (percentDiv.querySelector('.new-count-added')) return;

                // Find the inner div that contains the percentage text
                const innerDiv = percentDiv.querySelector('div');
                if (!innerDiv) return;

                // Create a new span for the absolute count
                const countSpan = document.createElement('span');
                countSpan.className = 'new-count-added';
                countSpan.textContent = absoluteNewCount.toString();
                countSpan.style.cssText = 'margin-left: auto;';

                // Append the count to the percentage div
                percentDiv.appendChild(countSpan);
            });
        });
    }

    // Run the function when the page loads
    addNewItemCounts();

    // Also run after a short delay to catch any dynamically loaded content
    setTimeout(addNewItemCounts, 500);
    setTimeout(addNewItemCounts, 1000);
})();
