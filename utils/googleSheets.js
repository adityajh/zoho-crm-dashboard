// Simple HTTP client for Google Apps Script API
// Using v1.2 trial URL for now
const SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL_V1_2 || 'https://script.google.com/macros/s/AKfycbwNldqib0fL2UXLirWgGVaZjAzjBI3theW3hGti2a0pdnB2_b5dNAKhZZoEGFWbxfD6/exec';

async function getCounts() {
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error reading from Google Sheets:', error);
        throw error;
    }
}

async function triggerEvent(eventType, params = {}) {
    try {
        const payload = { type: eventType, ...params };
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        return data; // returns the new global counts
    } catch (error) {
        console.error('Error triggering event in Google Sheets:', error);
        throw error;
    }
}

async function updateLeadScore(leadName, leadId, city, score1, score2, score3, score4) {
    return triggerEvent('new_lead', { leadName, leadId, city, score1, score2, score3, score4 });
}

async function updateCounts(actionType) {
    // Left for backwards compatibility, maybe passing actionType = 'new_application'
    return triggerEvent(actionType);
}

async function resetCounts() {
    return triggerEvent('reset');
}

module.exports = {
    getCounts,
    updateCounts,
    updateLeadScore,
    resetCounts
};
