const fs = require('fs');
const csv = require('csv-parser');
const fetch = require('node-fetch');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNldqib0fL2UXLirWgGVaZjAzjBI3theW3hGti2a0pdnB2_b5dNAKhZZoEGFWbxfD6/exec';

const results = [];
let dailyCounts = {};
let latestLeads = []; // We will store top 10

fs.createReadStream('Leads_2026_02_20.csv')
    .pipe(csv())
    .on('data', (data) => {
        // 1. Process Daily Counts
        const createdTimeStr = data['Created Time'];
        if (createdTimeStr) {
            // e.g., '2025-08-01 07:16:09' -> '2025-08-01'
            const datePart = createdTimeStr.split(' ')[0];

            if (!dailyCounts[datePart]) {
                dailyCounts[datePart] = { leads: 0, apps: 0 };
            }

            dailyCounts[datePart].leads += 1;

            // Count applications (e.g. Lead Status)
            // Adjust the condition based on how you mark Applications
            const status = data['Lead Status'] || '';
            if (status.toLowerCase().includes('application') || status.toLowerCase().includes('submitted')) {
                dailyCounts[datePart].apps += 1;
            }

            // 2. Process Score Data
            latestLeads.push({
                date: new Date(createdTimeStr),
                name: data['Lead Name'] || (data['First Name'] ? `${data['First Name']} ${data['Last Name']}` : data['Last Name']) || 'Unknown',
                id: data['Record Id'] || 'N/A',
                city: data['City'] || 'Unknown',
                score1: parseFloat(data['Lead_Source_Score']) || 0,
                score2: parseFloat(data['Lead_Age_Score']) || 0,
                score3: parseFloat(data['WA_Qualification_Score']) || 0,
                score4: parseFloat(data['Website_Analytics_Score']) || 0
            });
        }
    })
    .on('end', async () => {
        console.log('CSV file successfully processed. Total leads:', latestLeads.length);

        // Generate an array of exactly the last 30 days starting with TODAY (descending)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // normalize time

        const filledDailyCounts = [];
        for (let i = 0; i < 30; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - i);
            const dateStr = targetDate.toISOString().split('T')[0];

            filledDailyCounts.push({
                date: dateStr,
                leads: dailyCounts[dateStr] ? dailyCounts[dateStr].leads : 0,
                apps: dailyCounts[dateStr] ? dailyCounts[dateStr].apps : 0
            });
        }

        console.log(`Pushing the continuous block of exactly 30 days (Newest first)...`);

        // Sort latest leads descending (newest first) and keep top 30
        latestLeads.sort((a, b) => b.date - a.date);
        const top30 = latestLeads.slice(0, 30);

        // We need to send them slowly so Google Apps Script doesn't ratelimit us
        const delay = ms => new Promise(res => setTimeout(res, ms));

        try {
            // First, trigger global counter
            console.log(`Setting global leads to ${latestLeads.length} and apps to 0...`);
            await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'backfill_global', leads: latestLeads.length, applications: 0 })
            });
            await delay(1000);
        } catch (e) {
            console.error('Error with global counter', e);
        }

        // Push daily counts to Google Sheet via the Apps Script webhook
        for (const dataPoint of filledDailyCounts) {
            try {
                const payload = {
                    type: 'backfill_daily',
                    leads: dataPoint.leads,
                    applications: dataPoint.apps,
                    date: dataPoint.date
                };

                console.log(`Pushing: ${dataPoint.date} - L:${dataPoint.leads} A:${dataPoint.apps}`);
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                await delay(1000);
            } catch (e) {
                console.error('Error pushing data', e);
            }
        }

        console.log(`Pushing Top 30 newest leads...`);
        for (const lead of top30) {
            try {
                const payload = {
                    type: 'backfill_score',
                    date: lead.date.toISOString(),
                    leadName: lead.name,
                    leadId: lead.id,
                    city: lead.city,
                    score1: lead.score1,
                    score2: lead.score2,
                    score3: lead.score3,
                    score4: lead.score4
                };
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                await delay(1000);
            } catch (e) {
                console.error('Error pushing score', e);
            }
        }

        console.log('Backfill complete!');
    });
