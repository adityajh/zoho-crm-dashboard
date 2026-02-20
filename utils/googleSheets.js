// Simple HTTP client for Google Apps Script API
async function getCounts() {
    try {
        const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error reading from Google Sheets:', error);
        throw error;
    }
}

async function updateCounts(leads, applications) {
    try {
        const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ leads, applications }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error writing to Google Sheets:', error);
        throw error;
    }
}

module.exports = {
    getCounts,
    updateCounts,
};
