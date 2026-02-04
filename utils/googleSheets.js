const { google } = require('googleapis');

// Initialize Google Sheets API
const getAuthClient = () => {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return auth;
};

const sheets = google.sheets('v4');

// Get current counts from Google Sheet
async function getCounts() {
    try {
        const auth = await getAuthClient().getClient();
        const response = await sheets.spreadsheets.values.get({
            auth,
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A2:C2', // Row 2: Leads, Applications, LastUpdated
        });

        const values = response.data.values;
        if (!values || values.length === 0) {
            // Initialize if empty
            return { leads: 0, applications: 0, lastUpdated: new Date().toISOString() };
        }

        return {
            leads: parseInt(values[0][0]) || 0,
            applications: parseInt(values[0][1]) || 0,
            lastUpdated: values[0][2] || new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error reading from Google Sheets:', error);
        throw error;
    }
}

// Update counts in Google Sheet
async function updateCounts(leads, applications) {
    try {
        const auth = await getAuthClient().getClient();
        const lastUpdated = new Date().toISOString();

        await sheets.spreadsheets.values.update({
            auth,
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A2:C2',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[leads, applications, lastUpdated]],
            },
        });

        return { leads, applications, lastUpdated };
    } catch (error) {
        console.error('Error writing to Google Sheets:', error);
        throw error;
    }
}

module.exports = {
    getCounts,
    updateCounts,
};
