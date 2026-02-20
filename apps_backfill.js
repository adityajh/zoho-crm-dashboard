const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

const SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL_V1_2 || 'https://script.google.com/macros/s/AKfycbwNldqib0fL2UXLirWgGVaZjAzjBI3theW3hGti2a0pdnB2_b5dNAKhZZoEGFWbxfD6/exec';

const delay = ms => new Promise(res => setTimeout(res, ms));

const filePath = 'Step1LetsEnterpriseAdmissionsUGMED20251_Report.csv';
const applicationCounts = {};
let totalApplications = 0;

fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => {
        // e.g. "20-Feb-2026 22:08:06"
        const addedTimeStr = data['Added Time'];
        if (addedTimeStr) {
            const dateStr = addedTimeStr.split(' ')[0]; // "20-Feb-2026"
            const parsedDate = new Date(dateStr + " 12:00:00"); // Add noon to prevent UTC previous day drift
            if (!isNaN(parsedDate.getTime())) {
                const formattedDate = parsedDate.toISOString().split('T')[0]; // "2026-02-20"
                if (!applicationCounts[formattedDate]) {
                    applicationCounts[formattedDate] = 0;
                }
                applicationCounts[formattedDate] += 1;
                totalApplications += 1;
            }
        }
    })
    .on('end', async () => {
        console.log(`Successfully parsed CSV. Total Applications: ${totalApplications}`);

        try {
            // First Fetch current leads to preserve them
            const response = await fetch(SCRIPT_URL);
            const currentData = await response.json();
            const currentLeads = currentData.leads || 1510;

            console.log(`Setting global leads to ${currentLeads} and apps to ${totalApplications}...`);
            await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'backfill_global', leads: currentLeads, applications: totalApplications })
            });
            await delay(1000);
        } catch (e) {
            console.error('Error with global counter', e);
        }

        const dates = Object.keys(applicationCounts);
        console.log(`Pushing ${dates.length} days of application data...`);

        // Update Daily History in the Apps Script
        // NOTE: Our modified apps script supports 'backfill_application' mapped via 'overrideDate'
        // which iterates through dailyhistory to inject into existing dates

        for (const date of dates) {
            const count = applicationCounts[date];
            try {
                // Trigger 'new_application' multiple times to securely increment that date's tracker
                // wait, if there are 64 apps on a day, triggering 64 webhooks is too many.
                // It is better to use the exact `overrideDate` in Apps Script logic
                // The Apps Script handles 'backfill_application':
                // updateDailyCounter(false); -> this uses 'today' which is params.overrideDate.
                // So calling this N times increments the exact date!

                // Instead of calling 64 times, I can just modify the Apps Script logic to handle `params.increment`,
                // but since we only have a few applications per day, calling it in a loop is okay.
                console.log(`Pushing ${count} apps for ${date}...`);
                for (let i = 0; i < count; i++) {
                    await fetch(SCRIPT_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'backfill_application', overrideDate: date })
                    });
                    await delay(500); // 0.5s stagger
                }
                console.log(`Successfully mapped ${count} apps to ${date}`);

            } catch (e) {
                console.error(`Error pushing apps for date ${date}`, e);
            }
        }

        console.log('Application Backfill complete!');
    });
