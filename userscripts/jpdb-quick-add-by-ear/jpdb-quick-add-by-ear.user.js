// ==UserScript==
// @name         jpdb Quick Add - Picked up by ear (Ultra Robust)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Shortcut for "Picked up by ear" decks with smart anchoring
// @author       Assistant
// @match        https://jpdb.io/select_deck*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. Helper to find a deck container by name (regex handles leading numbers)
    function findDeckByName(name) {
        const deckNodes = document.querySelectorAll('.deck');
        for (const node of deckNodes) {
            const titleLink = node.querySelector('.deck-title a');
            if (titleLink) {
                const titleText = titleLink.textContent.trim();
                const regex = new RegExp(`^(\\d+\\.\\s*)?${name}$`, 'i');
                if (regex.test(titleText)) return node;
            }
        }
        return null;
    }

    // 2. Helper to check if the word is already in a deck (button says "Remove")
    function isWordInDeck(deckNode) {
        if (!deckNode) return false;
        const btn = deckNode.querySelector('input[type="submit"]');
        return btn && btn.value.toLowerCase().includes("remove");
    }

    // 3. Locate target decks
    const primaryDeck = findDeckByName("Picked up by ear");
    const againDeck = findDeckByName("Picked up by ear again!");

    if (!primaryDeck) return;

    const inPrimary = isWordInDeck(primaryDeck);
    const inAgain = isWordInDeck(againDeck);

    let label = "";
    let targetButton = null;
    let isDisabled = false;

    // 4. Determine State
    if (inAgain) {
        label = "🎉";
        isDisabled = true;
    } else if (inPrimary) {
        label = "Picked up again";
        targetButton = againDeck?.querySelector('input[type="submit"]');
    } else {
        label = "Pick up by ear";
        targetButton = primaryDeck.querySelector('input[type="submit"]');
    }

    // 5. Create the shortcut button
    const shortcutBtn = document.createElement('input');
    shortcutBtn.type = 'button';
    shortcutBtn.value = label;
    shortcutBtn.className = "outline";
    shortcutBtn.style.margin = "0.5rem 0 1rem 0";
    shortcutBtn.disabled = isDisabled;

    if (isDisabled) {
        shortcutBtn.style.cursor = "default";
        shortcutBtn.style.opacity = "1";
    } else if (targetButton) {
        shortcutBtn.onclick = () => targetButton.click();
    }

    // 6. SMART INJECTION
    // Priority 1: Next to "without kanji" button (if word has kanji)
    // Priority 2: Above "Select meanings" header (if word is kana-only)
    const withoutKanjiBtn = document.querySelector('input[value="I want to add this without kanji"]');
    const meaningsHeader = document.querySelector('h5');

    if (withoutKanjiBtn) {
        shortcutBtn.style.marginLeft = "10px";
        shortcutBtn.style.marginVertical = "0";
        withoutKanjiBtn.parentElement.appendChild(shortcutBtn);
    } else if (meaningsHeader) {
        // Create a small wrapper to keep things tidy
        const wrapper = document.createElement('div');
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "flex-start";
        wrapper.appendChild(shortcutBtn);
        meaningsHeader.parentNode.insertBefore(wrapper, meaningsHeader);
    }
})();