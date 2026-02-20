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
        const currentData = await googleSheets.getCounts();
        const updatedData = await googleSheets.updateCounts(currentData.leads + 1, currentData.applications);
        console.log(`✅ Lead count updated: ${updatedData.leads}`);
        res.json({ success: true, count: updatedData.leads });
    } catch (error) {
        console.error('Error updating lead count:', error);
        res.status(500).json({ success: false, error: 'Failed to update lead count' });
    }
});

app.post('/api/webhook/application', async (req, res) => {
    console.log('📝 Application webhook received');
    try {
        const currentData = await googleSheets.getCounts();
        const updatedData = await googleSheets.updateCounts(currentData.leads, currentData.applications + 1);
        console.log(`✅ Application count updated: ${updatedData.applications}`);
        res.json({ success: true, count: updatedData.applications });
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
        const updatedData = await googleSheets.updateCounts(0, 0);
        res.json({ success: true, message: 'Counters reset', data: updatedData });
    } catch (error) {
        console.error('Error resetting counters:', error);
        res.status(500).json({ success: false, error: 'Failed to reset counters' });
    }
});

// Export the app for Vercel
module.exports = app;
