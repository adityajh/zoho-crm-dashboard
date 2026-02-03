// Simple in-memory storage for Vercel serverless
// Note: This resets on each deployment. For production, use Vercel KV or a database.

let data = {
    leads: 0,
    applications: 0,
    lastUpdated: new Date().toISOString()
};

module.exports = {
    getData: () => data,
    setData: (newData) => {
        data = { ...newData, lastUpdated: new Date().toISOString() };
        return data;
    },
    incrementLeads: () => {
        data.leads += 1;
        data.lastUpdated = new Date().toISOString();
        return data;
    },
    incrementApplications: () => {
        data.applications += 1;
        data.lastUpdated = new Date().toISOString();
        return data;
    },
    reset: () => {
        data = {
            leads: 0,
            applications: 0,
            lastUpdated: new Date().toISOString()
        };
        return data;
    }
};
