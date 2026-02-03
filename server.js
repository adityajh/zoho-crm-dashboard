const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize data file if it doesn't exist
function initializeData() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            leads: 0,
            applications: 0,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ Data file initialized');
    }
}

// Read data from file
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return { leads: 0, applications: 0, lastUpdated: new Date().toISOString() };
    }
}

// Write data to file
function writeData(data) {
    try {
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data:', error);
        return false;
    }
}

// Webhook endpoint for new leads
app.post('/webhook/lead', (req, res) => {
    console.log('📊 New lead webhook received:', new Date().toISOString());
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    const data = readData();
    data.leads += 1;

    if (writeData(data)) {
        console.log(`✅ Lead count updated: ${data.leads}`);
        res.status(200).json({
            success: true,
            message: 'Lead count incremented',
            currentCount: data.leads
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'Failed to update lead count'
        });
    }
});

// Webhook endpoint for application forms
app.post('/webhook/application', (req, res) => {
    console.log('📝 Application form webhook received:', new Date().toISOString());
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    const data = readData();
    data.applications += 1;

    if (writeData(data)) {
        console.log(`✅ Application count updated: ${data.applications}`);
        res.status(200).json({
            success: true,
            message: 'Application count incremented',
            currentCount: data.applications
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'Failed to update application count'
        });
    }
});

// API endpoint to get current stats
app.get('/api/stats', (req, res) => {
    const data = readData();
    res.json(data);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Reset endpoint (for testing purposes)
app.post('/api/reset', (req, res) => {
    const data = {
        leads: 0,
        applications: 0,
        lastUpdated: new Date().toISOString()
    };

    if (writeData(data)) {
        console.log('🔄 Counters reset to zero');
        res.json({ success: true, message: 'Counters reset successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to reset counters' });
    }
});

// Initialize and start server
initializeData();

app.listen(PORT, () => {
    console.log('🚀 Zoho CRM Dashboard Server Started');
    console.log(`📍 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 Webhook URLs:`);
    console.log(`   - New Lead: http://localhost:${PORT}/webhook/lead`);
    console.log(`   - Application: http://localhost:${PORT}/webhook/application`);
    console.log(`📈 Stats API: http://localhost:${PORT}/api/stats`);
    console.log('');
    console.log('Ready to receive webhooks from Zoho CRM! 🎯');
});
