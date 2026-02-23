const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

// The Google Apps Script URL (Webhook)
const SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL_V1_2 || 'https://script.google.com/macros/s/AKfycbwNldqib0fL2UXLirWgGVaZjAzjBI3theW3hGti2a0pdnB2_b5dNAKhZZoEGFWbxfD6/exec';

const leadsFile = 'Leads_2026_02_23.csv';
const appsFile = 'Step1LetsEnterpriseAdmissionsUGMED20251_Report.csv';

// Storage mapping
const dailyCounts = {};
let totalLeadsCount = 0;
let totalAppsCount = 0;
const latestLeadsScores = [];

const delay = ms => new Promise(res => setTimeout(res, ms));

// Helper to normalize dates to local YYYY-MM-DD reliably
function formatDateKey(dateInput) {
    // "20-Feb-2026 22:08:06" -> "20-Feb-2026 12:00:00" to prevent UTC drift
    const dateStr = dateInput.split(' ')[0];
    const parsedDate = new Date(dateStr + " 12:00:00");
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
    }
    return null;
}

// Helper to format date just for display natively: dd/mm/yy - hh:mm
function formatDisplayDate(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} - ${hh}:${min}`;
}

// 1. Parse Leads
function parseLeads() {
    return new Promise((resolve) => {
        fs.createReadStream(leadsFile)
            .pipe(csv())
            .on('data', (data) => {
                const createdTimeStr = data['Created Time'];
                if (createdTimeStr) {
                    const dateKey = formatDateKey(createdTimeStr);
                    if (!dateKey) return;

                    if (!dailyCounts[dateKey]) {
                        dailyCounts[dateKey] = { leads: 0, apps: 0 };
                    }

                    dailyCounts[dateKey].leads += 1;
                    totalLeadsCount += 1;

                    // Extract logic for Score Backfilling
                    latestLeadsScores.push({
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
            .on('end', () => {
                console.log(`Leads CSV parsed. Total Leads: ${totalLeadsCount}`);
                resolve();
            });
    });
}

// 2. Parse Apps
function parseApps() {
    return new Promise((resolve) => {
        fs.createReadStream(appsFile)
            .pipe(csv())
            .on('data', (data) => {
                const addedTimeStr = data['Added Time'];
                if (addedTimeStr) {
                    const dateKey = formatDateKey(addedTimeStr);
                    if (!dateKey) return;

                    if (!dailyCounts[dateKey]) {
                        dailyCounts[dateKey] = { leads: 0, apps: 0 };
                    }
                    dailyCounts[dateKey].apps += 1;
                    totalAppsCount += 1;
                }
            })
            .on('end', () => {
                console.log(`Apps CSV parsed. Total Applications: ${totalAppsCount}`);
                resolve();
            });
    });
}

// 3. Execute Unified Pushing
async function runUnifiedBackfill() {
    await parseLeads();
    await parseApps();

    console.log('--- CSV Parsing Complete ---');

    // Generate continuous 30 days array starting strictly chronologically (Oldest first)
    // Actually, because our Apps Script `backfill_daily` just appends rows for backfills,
    // sending them descending (new to old) creates a top-down sheet. Let's send them descending.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const continuous30Days = [];
    for (let i = 0; i < 30; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        const dateKey = targetDate.toISOString().split('T')[0];

        continuous30Days.push({
            date: dateKey,
            leads: dailyCounts[dateKey] ? dailyCounts[dateKey].leads : 0,
            apps: dailyCounts[dateKey] ? dailyCounts[dateKey].apps : 0
        });
    }

    // Capture Top 30 descending for LeadScores
    latestLeadsScores.sort((a, b) => b.date - a.date);
    const top30Scores = latestLeadsScores.slice(0, 30);

    try {
        console.log(`Setting global leads to ${totalLeadsCount} and apps to ${totalAppsCount}...`);
        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'backfill_global', leads: totalLeadsCount, applications: totalAppsCount })
        });
        await delay(1000);
    } catch (e) { console.error('Error with global counter', e); }

    console.log('Pushing 30 continuous days (Newest first)...');
    for (const dataPoint of continuous30Days) {
        try {
            console.log(`Pushing: ${dataPoint.date} - L:${dataPoint.leads} A:${dataPoint.apps}`);
            await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'backfill_daily',
                    leads: dataPoint.leads,
                    applications: dataPoint.apps,
                    date: dataPoint.date
                })
            });
            await delay(1000);
        } catch (e) { console.error('Error pushing data', e); }
    }

    console.log('Pushing Top 30 Lead Scores...');
    for (const lead of top30Scores) {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'backfill_score',
                    date: formatDisplayDate(lead.date),
                    leadName: lead.name,
                    leadId: lead.id,
                    city: lead.city,
                    score1: lead.score1,
                    score2: lead.score2,
                    score3: lead.score3,
                    score4: lead.score4
                })
            });
            await delay(1000);
        } catch (e) { console.error('Error pushing score', e); }
    }

    console.log('✅ Backfill complete!');
}

runUnifiedBackfill();
