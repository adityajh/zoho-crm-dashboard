const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

const SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL_V1_2 || 'https://script.google.com/macros/s/AKfycbwNldqib0fL2UXLirWgGVaZjAzjBI3theW3hGti2a0pdnB2_b5dNAKhZZoEGFWbxfD6/exec';
const delay = ms => new Promise(res => setTimeout(res, ms));

function formatDisplayDate(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} - ${hh}:${min}`;
}

const leads = [];

fs.createReadStream('Leads_2026_02_25.csv').pipe(csv()).on('data', d => {
    const createdTimeStr = d['Created Time'];
    if (!createdTimeStr) return;

    // Parse "2026-02-23 20:11:59"
    const dateObj = new Date(createdTimeStr.replace(' ', 'T') + '+05:30'); // Assuming IST
    if (isNaN(dateObj)) return;

    const day = dateObj.getDate();
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();

    // We only care about Feb 23, 24, 25 of 2026
    if (year === 2026 && month === 1 && (day >= 23 && day <= 25)) {
        leads.push({
            date: dateObj,
            name: d['Lead Name'] || 'Unknown',
            id: d['Record Id'] || 'N/A',
            city: d['City'] || 'Unknown',
            score1: parseFloat(d['Lead_Source_Score']) || 0,
            score2: parseFloat(d['Lead_Age_Score']) || 0,
            score3: parseFloat(d['WA_Qualification_Score']) || 0,
            score4: parseFloat(d['Website_Analytics_Score']) || 0
        });
    }
}).on('end', async () => {
    // Sort oldest to newest (ascending) so they naturally stack with the newest on top in the Sheet
    leads.sort((a, b) => a.date - b.date);

    console.log(`Found ${leads.length} missing leads from Feb 23-25. Pushing to LeadScores...`);

    // 1. Push all missed leads to LeadScores
    for (const l of leads) {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'backfill_score', // Use backfill_score which appends to LeadScores
                    date: formatDisplayDate(l.date),
                    leadName: l.name,
                    leadId: l.id,
                    city: l.city,
                    score1: l.score1,
                    score2: l.score2,
                    score3: l.score3,
                    score4: l.score4
                })
            });
            process.stdout.write('.');
            await delay(1000); // 1 second delay to avoid rate limiting
        } catch (e) {
            console.error('\nError pushing lead:', l.name, e);
        }
    }
    console.log('\nLead backfill done!');

    // 2. Aggregate counts per day
    const countsPerDay = {
        '2026-02-23': 0,
        '2026-02-24': 0,
        '2026-02-25': 0
    };

    leads.forEach(l => {
        const d = String(l.date.getDate()).padStart(2, '0');
        const m = String(l.date.getMonth() + 1).padStart(2, '0');
        const y = l.date.getFullYear();
        const dateKey = `${y}-${m}-${d}`;
        if (countsPerDay[dateKey] !== undefined) {
            countsPerDay[dateKey]++;
        }
    });

    console.log('Daily counts calculated:', countsPerDay);

    // Assuming 0 applications on 24th/25th as per context, and 1 app on 23rd was already handled, but we need to push totals
    // Actually, user wants DailyTotals for 23, 24.
    const dailyData = [
        { date: '2026-02-25', leads: countsPerDay['2026-02-25'], apps: 0 },
        { date: '2026-02-24', leads: countsPerDay['2026-02-24'], apps: 0 },
        { date: '2026-02-23', leads: countsPerDay['2026-02-23'], apps: 1 } // Adding the 1 app we know existed
    ];

    // IMPORTANT: the user deleted 23 and 24. They might have deleted 25 too. So we push them.
    for (const dayData of dailyData) {
        try {
            console.log(`Pushing DailyTotals for ${dayData.date}: Leads=${dayData.leads}, Apps=${dayData.apps}`);
            await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'backfill_daily',
                    leads: dayData.leads,
                    applications: dayData.apps,
                    date: dayData.date
                })
            });
            await delay(1000);
        } catch (e) {
            console.error('Error pushing daily data:', e);
        }
    }

    // 3. Update TotalCounters
    console.log('Updating TotalCounters...');
    try {
        const cur = await fetch(SCRIPT_URL).then(r => r.json());
        const currentLeads = cur.leads || 1552;
        // Since we are backfilling new leads that were missing, we add to the counter
        const newTotalLeads = currentLeads + leads.length;

        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'backfill_global',
                leads: newTotalLeads,
                applications: cur.applications || 212
            })
        });
        console.log(`Global counter updated to ${newTotalLeads} leads.`);
    } catch (e) {
        console.error('Error updating total counter:', e);
    }

    console.log('All backfill tasks complete!');
});
