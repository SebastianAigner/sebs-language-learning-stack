// TTS Status Indicator for vanilla JS
// Inspired by jpdb-conjugation-trainer's TTSStatusIndicator.tsx

const CHECK_INTERVAL = 60000; // Check every minute

export function initTTSIndicator(containerId, ttsServiceUrl) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id ${containerId} not found`);
        return;
    }

    let isOnline = null;

    const updateUI = () => {
        if (isOnline === null) {
            container.innerHTML = '';
            return;
        }

        const title = isOnline ? 'TTS service online' : 'TTS service offline';
        
        container.innerHTML = `
            <a href="${ttsServiceUrl}" target="_blank" rel="noopener noreferrer" 
               style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666; text-decoration: none; cursor: pointer;"
               title="${title}">
                ${isOnline ? `
                    <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #48bb78; box-shadow: 0 0 8px rgba(72, 187, 120, 0.6); animation: pulse 2s ease-in-out infinite;"></div>
                ` : `
                    <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 9px solid #f56565; filter: drop-shadow(0 0 4px rgba(245, 101, 101, 0.6));"></div>
                `}
                <span style="font-weight: 500;">TTS</span>
            </a>
        `;
    };

    const checkStatus = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

            const response = await fetch(`${ttsServiceUrl}/health`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                isOnline = true;
            } else {
                isOnline = false;
            }
        } catch (error) {
            isOnline = false;
        }
        updateUI();
    };

    // Check immediately on mount
    void checkStatus();

    // Then check periodically
    const interval = setInterval(() => {
        void checkStatus();
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
}
