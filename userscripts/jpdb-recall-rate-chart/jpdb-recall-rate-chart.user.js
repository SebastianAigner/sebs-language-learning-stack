// ==UserScript==
// @name         jpdb Stats Recall Rate Chart
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a recall rate bar chart to the jpdb stats page
// @author       Gemini
// @match        https://jpdb.io/stats
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function init() {
        // 1. Locate the existing data from the script tags
        const scripts = Array.from(document.querySelectorAll('script'));
        const statsScript = scripts.find(s => s.textContent.includes('Old cards (failed)'));

        if (!statsScript) return;

        // 2. Extract failed and passed data using Regex
        const failedMatch = statsScript.textContent.match(/label: "Old cards \(failed\)",.*?data: \[(.*?)\]/s);
        const passedMatch = statsScript.textContent.match(/label: "Old cards \(passed\)",.*?data: \[(.*?)\]/s);

        if (!failedMatch || !passedMatch) return;

        const failedData = failedMatch[1].split(',').map(Number);
        const passedData = passedMatch[1].split(',').map(Number);
        const labels = ["7 days ago", "6 days ago", "5 days ago", "4 days ago", "3 days ago", "2 days ago", "Yesterday", "Today"];

        // 3. Calculate Recall Rate percentages
        const recallData = passedData.map((passed, i) => {
            const total = passed + failedData[i];
            return total === 0 ? 0 : Math.round((passed / total) * 1000) / 10;
        });

        // 4. Create the UI elements
        const originalChart = document.getElementById('chart');
        const container = originalChart.parentElement;

        const heading = document.createElement('h5');
        heading.style.cssText = "text-align: center; font-size: 130%; margin-top: 2rem;";
        heading.textContent = "Recall rate (%)";

        const canvas = document.createElement('canvas');
        canvas.id = "recallChart";
        canvas.width = 400;
        canvas.height = 250;
        canvas.style.cssText = "margin-bottom: 2rem; max-height: 25rem;";

        // Insert after the first chart
        originalChart.after(heading);
        heading.after(canvas);

        // 5. Initialize the chart
        function cssvar(name) {
            return getComputedStyle(document.documentElement).getPropertyValue(name);
        }

        new Chart(canvas.getContext('2d'), {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Recall Rate (%)",
                    backgroundColor: "rgba(153, 102, 255, 0.75)",
                    borderColor: "rgba(153, 102, 255, 1)",
                    borderWidth: 1,
                    data: recallData
                }]
            },
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` ${context.parsed.y}%`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: cssvar("--text-color") },
                        grid: { color: cssvar("--table-border-color") }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: cssvar("--text-color"),
                            callback: (value) => value + "%"
                        },
                        grid: { color: cssvar("--table-border-color") }
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Run slightly delayed to ensure Chart.js/DOM is ready
    if (document.readyState === 'loading') {
        window.addEventListener('load', init);
    } else {
        setTimeout(init, 100);
    }
})();