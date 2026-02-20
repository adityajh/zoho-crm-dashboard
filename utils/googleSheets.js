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

async function updateCounts(leads, applications) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'counter_update', leads, applications }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error writing counts to Google Sheets:', error);
        throw error;
    }
}

async function updateLeadScore(score1, score2, score3, score4) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'new_lead_score', score1, score2, score3, score4 }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error writing score to Google Sheets:', error);
        throw error;
    }
}

module.exports = {
    getCounts,
    updateCounts,
    updateLeadScore
};
