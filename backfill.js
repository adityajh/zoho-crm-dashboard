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
                score1: parseFloat(data['Lead_Source_Score']) || 0,
                score2: parseFloat(data['Lead_Age_Score']) || 0,
                score3: parseFloat(data['WA_Qualification_Score']) || 0,
                score4: parseFloat(data['Website_Analytics_Score']) || 0
            });
        }
    })
    .on('end', async () => {
        console.log('CSV file successfully processed.');

        // Generate an array of exactly the last 30 days (including today)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // normalize time

        const filledDailyCounts = [];
        for (let i = 29; i >= 0; i--) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - i);
            const dateStr = targetDate.toISOString().split('T')[0];

            filledDailyCounts.push({
                date: dateStr,
                leads: dailyCounts[dateStr] ? dailyCounts[dateStr].leads : 0,
                apps: dailyCounts[dateStr] ? dailyCounts[dateStr].apps : 0
            });
        }

        console.log(`Pushing the continuous block of exactly 30 days...`);

        // Let's sort latest leads chronologically and keep the last 10
        latestLeads.sort((a, b) => a.date - b.date);
        const top10 = latestLeads.slice(-10);

        // Push daily counts to Google Sheet via the Apps Script webhook
        for (const dataPoint of filledDailyCounts) {
            try {
                // Format to what your webhook expects
                const payload = {
                    type: 'backfill_counter',
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
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                console.error('Error pushing data', e);
            }
        }

        console.log(`Pushing Top 10 leads...`);
        for (const lead of top10) {
            try {
                const payload = {
                    type: 'backfill_score',
                    date: lead.date.toISOString(),
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
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                console.error('Error pushing score', e);
            }
        }
    });
