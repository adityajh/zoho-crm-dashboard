require('dotenv').config();
const express = require('express');
const path = require('path');
const apiApp = require('./api/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Use the API app as middleware
app.use(apiApp);

// Only start server if not in Vercel environment
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log('🚀 Zoho CRM Dashboard Server Started (V1.2 Local Mode)');
        console.log(`📍 Server running on http://localhost:${PORT}`);
        console.log(`📊 Dashboard: http://localhost:${PORT}`);
        console.log(`🔗 Webhook URLs (via ngrok):`);
        console.log(`   - New Lead: http://<ngrok-url>/api/webhook/lead`);
        console.log(`   - Application: http://<ngrok-url>/api/webhook/application`);
        console.log(`📈 Stats API: http://localhost:${PORT}/api/stats`);
    });
}

module.exports = app;
