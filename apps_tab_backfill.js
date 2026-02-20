const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

const SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL_V1_2 || 'https://script.google.com/macros/s/AKfycbwNldqib0fL2UXLirWgGVaZjAzjBI3theW3hGti2a0pdnB2_b5dNAKhZZoEGFWbxfD6/exec';

const delay = ms => new Promise(res => setTimeout(res, ms));

// Helper to format date just for display: dd/mm/yy - hh:mm
function formatDisplayDate(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} - ${hh}:${min}`;
}

const appsData = [];

fs.createReadStream('Step1LetsEnterpriseAdmissionsUGMED20251_Report.csv')
    .pipe(csv())
    .on('data', (row) => {
        const addedTimeStr = row['Added Time'];
        if (!addedTimeStr) return;

        // "20-Feb-2026 22:08:06" -> JS Date (Add +05:30 offset or assume local)
        const parsedDate = new Date(addedTimeStr);

        let charCount = 0;
        // Sum the length of all long-form fields dynamically by checking question flags
        Object.keys(row).forEach(key => {
            if (
                key.includes('enjoy the most') ||
                key.includes('contributed to') ||
                key.includes('innovative path') ||
                key.includes('5 years from now') ||
                key.includes('choosing UG-MED')
            ) {
                charCount += (row[key] || '').length;
            }
        });

        appsData.push({
            nativeDate: parsedDate,
            timestamp: formatDisplayDate(parsedDate),
            appName: row['Name'] || '',
            email: row['Email'] || '',
            mobile: row['Mobile Number'] || '',
            city: row['Your city of residence'] || '',
            school: row['School Name'] || '',
            stream: row['Stream'] || '',
            tenth: row['10th Grade %'] || '',
            twelfth: row['12th Grade Status'] || '',
            source: row['How did you come to know about us?'] || '',
            referrer: row['Referral Name (if any)'] || '',
            extracurriculars: row['Extra-Curricular Activities'] || '',
            charCount: charCount
        });
    })
    .on('end', async () => {
        console.log(`Parsed ${appsData.length} total applications.`);

        // Sort descending (newest on top natively)
        appsData.sort((a, b) => b.nativeDate - a.nativeDate);

        // Grab Top 30 for backfill
        const top30 = appsData.slice(0, 30);
        console.log('Sending Top 30 recently mapped applications to new tab...');

        for (const app of top30) {
            try {
                // Notice we do NOT pass overrideDate, because we don't want to increment daily counters again!
                // We only pass overrideTimestamp so it gets cleanly injected into the Applications Tab rows!
                const payload = {
                    type: 'backfill_application',
                    overrideTimestamp: app.timestamp,
                    appName: app.appName,
                    email: app.email,
                    mobile: app.mobile,
                    city: app.city,
                    school: app.school,
                    stream: app.stream,
                    tenth: app.tenth,
                    twelfth: app.twelfth,
                    source: app.source,
                    referrer: app.referrer,
                    extracurriculars: app.extracurriculars,
                    charCount: app.charCount
                };

                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                console.log(`Pushed: ${app.appName} [${app.charCount} chars]`);
                await delay(1000); // 1 second stagger to avoid GAS rate limit
            } catch (e) {
                console.error(`Error mapping ${app.appName}`, e);
            }
        }

        console.log('Application Tab population complete!');
    });
