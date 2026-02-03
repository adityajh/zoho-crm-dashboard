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

    console.log('📝 Application form webhook received:', new Date().toISOString());
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    try {
        const data = dataStore.incrementApplications();
        console.log(`✅ Application count updated: ${data.applications}`);

        return res.status(200).json({
            success: true,
            message: 'Application count incremented',
            currentCount: data.applications
        });
    } catch (error) {
        console.error('Error incrementing applications:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update application count'
        });
    }
};
