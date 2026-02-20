const express = require('express');
const cors = require('cors');
const googleSheets = require('../utils/googleSheets');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- Webhook Endpoints ---

app.post('/api/webhook/lead', async (req, res) => {
    console.log('📊 New lead webhook received');
    try {
        const body = req.body || {};

        // Extract additional lead info
        const leadName = body.Lead_Name || body.Full_Name || (body.First_Name ? `${body.First_Name} ${body.Last_Name}` : body.Last_Name) || 'Unknown Lead';
        const leadId = body.id || body.Record_Id || body.Lead_Id || 'N/A';
        const city = body.City || 'Unknown';

        // Extract the 4 scores (default to 0 if not present)
        const score1 = parseFloat(body.Lead_Source_Rule) || 0;
        const score2 = parseFloat(body.Lead_Age_Scoring_Rule) || 0;
        const score3 = parseFloat(body.WA_Qual_Score) || parseFloat(body['WA_Qual._Scoring_Rule']) || 0;
        const score4 = parseFloat(body.Website_Analytics_Rule) || 0;

        // Trigger 'new_lead' event on Apps Script and pass scores
        // We merged counts & score into one call
        const updatedData = await googleSheets.updateLeadScore(leadName, leadId, city, score1, score2, score3, score4);

        console.log(`✅ Lead count updated: ${updatedData.leads || 'Processed'} | Scores recorded`);
        res.json({ success: true, count: updatedData.leads });
    } catch (error) {
        console.error('Error updating lead count or score:', error);
        res.status(500).json({ success: false, error: 'Failed to update lead data' });
    }
});

app.post('/api/webhook/application', async (req, res) => {
    console.log('📝 Application webhook received');
    try {
        const body = req.body || {};
        console.log('Mapping Application Payload onto New Tab:', body.id);

        let charCount = 0;
        // Search keys logically or via substring matching to parse essay lengths from webhook body 
        Object.keys(body).forEach(key => {
            const kl = key.toLowerCase();
            if (
                kl.includes('enjoy the most') ||
                kl.includes('contributed to') ||
                kl.includes('innovative path') ||
                kl.includes('5 years from now') ||
                kl.includes('choosing ug-med')
            ) {
                charCount += String(body[key] || '').length;
            }
        });

        // Check for Zoho's standard param keys and map to our 13-column tab
        const params = {
            appName: body.Name || body.Full_Name || (body.First_Name ? `${body.First_Name} ${body.Last_Name}` : body.Last_Name) || 'Unknown',
            email: body.Email || body.Email_ID || '',
            mobile: body.Mobile_Number || body.Mobile || body.Phone || '',
            city: body.Your_city_of_residence || body.City || '',
            school: body.School_Name || body.School || '',
            stream: body.Stream || '',
            tenth: body['10th_Grade_%'] || body['10th_Grade'] || '',
            twelfth: body['12th_Grade_Status'] || body['12th_Grade'] || '',
            source: body['How_did_you_come_to_know_about_us?'] || body.Lead_Source || '',
            referrer: body['Referral_Name_(if_any)'] || body.Referral_Name || body.Referrer || '',
            extracurriculars: body['Extra-Curricular_Activities'] || body.Extra_Curricular_Activities || '',
            charCount: charCount
        };

        // Trigger 'new_application' event on Apps Script and pass mapped Application Data
        const updatedData = await googleSheets.updateApplicationCounts(params);

        console.log(`✅ Application count updated internally: ${updatedData.apps}`);
        res.json({ success: true, count: updatedData.apps });
    } catch (error) {
        console.error('Error updating application count:', error);
        res.status(500).json({ success: false, error: 'Failed to update application count' });
    }
});

// --- Stats API ---

app.get('/api/stats', async (req, res) => {
    try {
        const data = await googleSheets.getCounts();
        res.json(data);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        storage: 'google-sheets'
    });
});

// --- Reset ---

app.post('/api/reset', async (req, res) => {
    try {
        const updatedData = await googleSheets.resetCounts();
        res.json({ success: true, message: 'Counters reset', data: updatedData });
    } catch (error) {
        console.error('Error resetting counters:', error);
        res.status(500).json({ success: false, error: 'Failed to reset counters' });
    }
});

// Export the app for Vercel
module.exports = app;
