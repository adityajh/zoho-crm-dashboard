const express = require('express');
const cors = require('cors');
const googleSheets = require('../utils/googleSheets');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Zoho sends Form-Data

// --- Webhook Endpoints ---

app.post('/api/webhook/lead', async (req, res) => {
    console.log('📊 New lead webhook received');
    try {
        const body = req.body || {};

        // Extract additional lead info
        const leadName = body.Lead_Name || body.Full_Name || (body.First_Name ? `${body.First_Name} ${body.Last_Name}` : body.Last_Name) || 'Unknown Lead';
        const leadId = body.id || body.Record_Id || body.Lead_Id || 'N/A';
        const city = body.City || 'Unknown';

        // Extract the 4 scores — try multiple possible field name formats from Zoho
        const score1 = parseFloat(body.Lead_Source_Score) || parseFloat(body.Lead_Source_Rule) || 0;
        const score2 = parseFloat(body.Lead_Age_Score) || parseFloat(body.Lead_Age_Scoring_Rule) || 0;
        const score3 = parseFloat(body.WA_Qualification_Score) || parseFloat(body.WA_Qual_Score) || parseFloat(body['WA_Qual._Scoring_Rule']) || 0;
        const score4 = parseFloat(body.Website_Analytics_Score) || parseFloat(body.Website_Analytics_Rule) || 0;

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
        console.log('Application body keys:', Object.keys(body));

        // 5 essay fields — used for character count calculation
        const essay1 = String(body['3 things you enjoy'] || body['3_things_you_enjoy'] || '');
        const essay2 = String(body['1 thing you created'] || body['1_thing_you_created'] || '');
        const essay3 = String(body['Why this path'] || body['Why_this_path'] || '');
        const essay4 = String(body['5 years from now'] || body['5_years_from_now'] || '');
        const essay5 = String(body['Whats your why'] || body['Whats_your_why'] || '');
        const charCount = essay1.length + essay2.length + essay3.length + essay4.length + essay5.length;

        // Map to our 18-column Applications tab
        const params = {
            appName: body.Name || 'Unknown',
            email: body.Email || '',
            mobile: body.Mobile || '',
            city: body.City || '',
            school: body.School || '',
            stream: body.Stream || '',
            tenth: body['10th_Grade'] || '',
            twelfth: body['12th_Grade'] || '',
            source: body.Lead_Source || '',
            referrer: body.Referrer || '',
            extracurriculars: body.Extra_Curricular_Activities || '',
            essay1: essay1,
            essay2: essay2,
            essay3: essay3,
            essay4: essay4,
            essay5: essay5,
            charCount: charCount
        };

        const updatedData = await googleSheets.updateApplicationCounts(params);

        console.log(`✅ Application count updated: ${updatedData.apps} | Char count: ${charCount}`);
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
