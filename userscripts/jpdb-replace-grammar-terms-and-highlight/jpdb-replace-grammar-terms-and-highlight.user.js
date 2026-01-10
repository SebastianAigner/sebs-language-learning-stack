// ==UserScript==
// @name         Grammar Term Replacer with Coloring
// @namespace    https://jpdb.io
// @version      1.1
// @description  Replaces grammar terms and applies custom colors to specific terms
// @author       You
// @match        https://jpdb.io/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Define an array of word replacements
    const replacements = [
        { original: 'intransitive', replacement: 'self-move' },
        { original: 'transitive', replacement: 'other-move' }
    ];

    // Define words to color and their respective colors
    const colorings = [
        { word: 'self-move', color: '#4CAF50' },   // Green
        { word: 'other-move', color: '#FF9800' },  // Orange
        { word: 'verb', color: '#2196F3' },        // Blue
        { word: 'noun', color: '#E91E63' },        // Pink
        { word: 'Adjective (い)', color: '#9C27B0' }, // Purple
        { word: 'Adjective (な)', color: '#00BCD4' }, // Cyan
        { word: 'Adjective (の)', color: '#FFEB3B' }, // Yellow
        { word: 'suffix', color: '#795548' }       // Brown
    ];

    // Create and inject a stylesheet for our colored spans
    function injectStylesheet() {
        const style = document.createElement('style');
        style.id = 'grammar-term-colors';
        style.textContent = colorings.map(item =>
            `.grammar-colored-${item.word.replace(/[\(\)\s-]/g, '_')} { color: ${item.color}; font-weight: bold; }`
        ).join('\n');
        document.head.appendChild(style);
    }

    // Helper function to get all text nodes under a specific element
    function getTextNodesUnder(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            { acceptNode: node => node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT },
            false
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        return textNodes;
    }

    // Process a single text node for replacements
    function processTextNodeReplacements(node) {
        // Skip nodes that are already inside our colored spans
        if (node.parentNode && node.parentNode.classList &&
            Array.from(node.parentNode.classList).some(cls => cls.startsWith('grammar-colored-'))) {
            return false;
        }

        let newText = node.nodeValue;
        let hasChanged = false;

        // Apply each replacement once per node
        replacements.forEach(({ original, replacement }) => {
            // Regular expression with word boundaries
            const regex = new RegExp('\\b' + original + '\\b', 'gi');

            // Perform the replacement preserving case
            newText = newText.replace(regex, function(match) {
                hasChanged = true;

                // If the original was all uppercase
                if (match === match.toUpperCase()) {
                    return replacement.toUpperCase();
                }
                // If the original was capitalized
                else if (match.charAt(0) === match.charAt(0).toUpperCase()) {
                    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
                }
                // Default case (lowercase)
                else {
                    return replacement;
                }
            });
        });

        // Update the node's text only if changes were made
        if (hasChanged) {
            node.nodeValue = newText;
        }

        return hasChanged;
    }

    // Function to apply colors to specific words
    function applyColorToWords() {
        // Get all text nodes within the body element
        const textNodes = getTextNodesUnder(document.body);

        // Process each text node for coloring
        textNodes.forEach(node => {
            // Skip nodes that are already inside our colored spans
            if (node.parentNode && node.parentNode.classList &&
                Array.from(node.parentNode.classList).some(cls => cls.startsWith('grammar-colored-'))) {
                return;
            }

            // Check if this node contains any of our target words
            let originalText = node.nodeValue;
            let fragments = [];
            let lastIndex = 0;
            let hasMatches = false;

            // Build a single regex for all words to color (to avoid multiple passes)
            const wordPatterns = [];
            const wordToColorMap = {};

            colorings.forEach(({ word, color }) => {
                const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                wordPatterns.push(`\\b(${escapedWord})\\b`);
                wordToColorMap[word.toLowerCase()] = word;
            });

            // Combine all patterns into one regex with capturing groups
            const combinedPattern = new RegExp(wordPatterns.join('|'), 'gi');

            // Find all matches in the text
            let match;
            while ((match = combinedPattern.exec(originalText)) !== null) {
                hasMatches = true;

                // Add text before the match
                if (match.index > lastIndex) {
                    fragments.push({
                        text: originalText.substring(lastIndex, match.index),
                        color: null
                    });
                }

                // Determine which word was matched
                const matchedWord = match[0];
                const lowerMatch = matchedWord.toLowerCase();
                const originalTerm = wordToColorMap[lowerMatch] ||
                    Object.keys(wordToColorMap).find(k =>
                        lowerMatch === k.toLowerCase());

                if (originalTerm) {
                    // Add the matched text with its color
                    fragments.push({
                        text: matchedWord,
                        color: originalTerm.replace(/[\(\)\s-]/g, '_')
                    });
                } else {
                    // No match found (shouldn't happen)
                    fragments.push({
                        text: matchedWord,
                        color: null
                    });
                }

                lastIndex = match.index + match[0].length;
            }

            // Add any remaining text
            if (lastIndex < originalText.length) {
                fragments.push({
                    text: originalText.substring(lastIndex),
                    color: null
                });
            }

            // If there were matches, replace the text node with the colored spans
            if (hasMatches && fragments.length > 0) {
                const container = document.createDocumentFragment();

                fragments.forEach(fragment => {
                    if (fragment.color) {
                        // Create a colored span
                        const span = document.createElement('span');
                        span.className = `grammar-colored-${fragment.color}`;
                        span.textContent = fragment.text;
                        span.title = `Grammar term: ${fragment.text}`;  // Add tooltip
                        container.appendChild(span);
                    } else {
                        // Add plain text
                        container.appendChild(document.createTextNode(fragment.text));
                    }
                });

                // Replace the original node with our fragment
                node.parentNode.replaceChild(container, node);
            }
        });
    }

    // Main function to handle both replacements and coloring
    function performTransformations() {
        // First do the replacements
        const textNodes = getTextNodesUnder(document.body);
        textNodes.forEach(node => processTextNodeReplacements(node));

        // Then apply the coloring (on the modified DOM)
        applyColorToWords();
    }

    // Inject the stylesheet when the script loads
    injectStylesheet();

    // Run the transformations immediately when the script loads
    performTransformations();

    // Set up a mutation observer to handle dynamic content changes
    const observer = new MutationObserver(mutations => {
        // Check if we need to process mutations
        const shouldProcess = mutations.some(mutation => {
            // Process if nodes were added
            if (mutation.addedNodes.length > 0) return true;

            // Process if character data changed
            if (mutation.type === 'characterData') return true;

            return false;
        });

        if (shouldProcess) {
            // When the DOM changes, run our transformation function again
            performTransformations();
        }
    });

    // Configure the observer to watch for changes to the DOM structure
    observer.observe(document.body, {
        childList: true,    // Watch for changes to direct children
        subtree: true,      // Watch the entire subtree
        characterData: true // Watch for changes to text content
    });
})();