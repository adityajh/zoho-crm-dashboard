const dataStore = require('../data');

module.exports = (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('📊 New lead webhook received:', new Date().toISOString());
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    try {
        const data = dataStore.incrementLeads();
        console.log(`✅ Lead count updated: ${data.leads}`);

        return res.status(200).json({
            success: true,
            message: 'Lead count incremented',
            currentCount: data.leads
        });
    } catch (error) {
        console.error('Error incrementing leads:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update lead count'
        });
    }
};
