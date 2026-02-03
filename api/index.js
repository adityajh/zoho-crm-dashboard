const express = require('express');
const cors = require('cors');

const app = express();

// In-memory data store (shared across endpoints in the same warm instance)
let data = {
    leads: 0,
    applications: 0,
    lastUpdated: new Date().toISOString()
};

// Middleware
app.use(cors());
app.use(express.json());

// Helper to update lastUpdated
const updateTime = () => {
    data.lastUpdated = new Date().toISOString();
};

// --- Webhook Endpoints ---

app.post('/api/webhook/lead', (req, res) => {
    console.log('📊 New lead webhook received');
    data.leads += 1;
    updateTime();
    console.log(`✅ Lead count updated: ${data.leads}`);
    res.json({ success: true, count: data.leads });
});

app.post('/api/webhook/application', (req, res) => {
    console.log('📝 Application webhook received');
    data.applications += 1;
    updateTime();
    console.log(`✅ Application count updated: ${data.applications}`);
    res.json({ success: true, count: data.applications });
});

// --- Stats API ---

app.get('/api/stats', (req, res) => {
    res.json(data);
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// --- Reset ---

app.post('/api/reset', (req, res) => {
    data.leads = 0;
    data.applications = 0;
    updateTime();
    res.json({ success: true, message: 'Counters reset' });
});

// Export the app for Vercel
module.exports = app;
