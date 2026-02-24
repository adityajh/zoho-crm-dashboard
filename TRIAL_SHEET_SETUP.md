# Trial Sheet Setup for V1.2

Please update your Trial Sheet to match the new robust structure. This ensures your data is sorted with the newest records on top, features a dedicated Total Counters tab, and keeps 30 days continuous.

## Step 1: Set Up the Tabs
In your `Zoho CRM Dashboard Data v1.2 Trial` Sheet, ensure you have these **four tabs** exactly named:
1. `TotalCounters`
2. `DailyTotals`
3. `LeadScores`
4. `Applications`

### `TotalCounters` Tab Headers (Row 1):
| A | B | C |
|---|---|---|
| Leads | Applications | LastUpdated |

*(In Row 2, initialize with: `0`, `0`, and leave C blank)*

### `DailyTotals` Tab Headers (Row 1):
| A | B | C |
|---|---|---|
| Date | Leads | Applications |

*(Used for 30-day graphs. Data will be pushed down daily!)*

### `LeadScores` Tab Headers (Row 1):
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Date | Name | ID | City | Score1 | Score2 | Score3 | Score4 |

*(Used for Average Lead Score. Newest leads will be at the top!)*

### `Applications` Tab Headers (Row 1):
| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Date | Name | Email | Mobile | City | School | Stream | 10th % | 12th Status | Source | Referrer | Extracurriculars | 3 Things Enjoy | 1 Thing Created | Why This Path | 5 Years From Now | Whats Your Why | Char Count |

*(Used for Application tracking. Appends new apps to the top natively!)*

## Step 2: Deploy the New Apps Script
1. In the Trial Sheet, click **Extensions > Apps Script**.
2. Delete the old code, and paste this massive new upgrade:

```javascript
// ====== v1.2.1 Trial Apps Script ======
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get Total Counters
  const counterSheet = ss.getSheetByName('TotalCounters');
  const counterData = counterSheet.getRange('A2:C2').getValues()[0] || [0, 0, ''];
  const totalLeads = parseInt(counterData[0]) || 0;
  const totalApps = parseInt(counterData[1]) || 0;
  const lastUpdated = counterData[2] || new Date().toISOString();

  // 2. Get Daily Totals (First 30 rows = Last 30 days since newest is on top)
  const dailySheet = ss.getSheetByName('DailyTotals');
  const dailyData = dailySheet.getDataRange().getValues();
  let dailyTotals = [];
  if (dailyData.length > 1) {
    const endRow = Math.min(dailyData.length, 31); // Header + 30 days
    for(let i=1; i<endRow; i++) {
        dailyTotals.push({
            date: dailyData[i][0],
            leads: parseInt(dailyData[i][1]) || 0,
            applications: parseInt(dailyData[i][2]) || 0
        });
    }
  }

  // 3. Get Last 10 Lead Scores (First 10 rows under header)
  const scoreSheet = ss.getSheetByName('LeadScores');
  const scoreData = scoreSheet.getDataRange().getValues();
  let latest10Scores = [];
  if (scoreData.length > 1) {
     const endRow = Math.min(scoreData.length, 11); // Header + 10 leads
     for(let i=1; i<endRow; i++) {
         latest10Scores.push({
             date: scoreData[i][0],
             name: scoreData[i][1] || 'Unknown',
             id: scoreData[i][2] || 'N/A',
             city: scoreData[i][3] || 'Unknown',
             score1: parseFloat(scoreData[i][4]) || 0,
             score2: parseFloat(scoreData[i][5]) || 0,
             score3: parseFloat(scoreData[i][6]) || 0,
             score4: parseFloat(scoreData[i][7]) || 0
         });
     }
  }

  return ContentService.createTextOutput(JSON.stringify({
    leads: totalLeads,
    applications: totalApps,
    lastUpdated: lastUpdated,
    dailyHistory: dailyTotals,
    recentScores: latest10Scores
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // Prevent race conditions from concurrent Zoho webhooks
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Wait up to 30 seconds
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const params = JSON.parse(e.postData.contents);
    const today = params.overrideDate || Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
    
    // ISO timestamp for TotalCounters (needed by frontend to calculate "X minutes ago")
    const isoTimestamp = new Date().toISOString();
    
    // Formatted timestamp 'dd/mm/yy - hh:mm' for LeadScores and Applications display
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const displayTimestamp = params.overrideTimestamp || `${dd}/${mm}/${yy} - ${hh}:${min}`;
    
    // --- HELPERS ---
    const updateGlobalCounter = (isLead) => {
        const counterSheet = ss.getSheetByName('TotalCounters');
        let leads = parseInt(counterSheet.getRange('A2').getValue()) || 0;
        let apps = parseInt(counterSheet.getRange('B2').getValue()) || 0;
        if (isLead) leads += 1;
        else apps += 1;
        counterSheet.getRange('A2:C2').setValues([[leads, apps, isoTimestamp]]);
        return { leads, apps };
    };

    // updateDailyCounter removed — DailyTotals is now updated by a midnight cron function


    const insertApplicationRecord = (p, timeStr) => {
        const appSheet = ss.getSheetByName('Applications');
        if (!appSheet) return;
        
        appSheet.insertRowBefore(2);
        appSheet.getRange('A2:R2').setValues([[
            timeStr,
            p.appName || '',
            p.email || '',
            p.mobile || '',
            p.city || '',
            p.school || '',
            p.stream || '',
            p.tenth || '',
            p.twelfth || '',
            p.source || '',
            p.referrer || '',
            p.extracurriculars || '',
            p.essay1 || '',
            p.essay2 || '',
            p.essay3 || '',
            p.essay4 || '',
            p.essay5 || '',
            p.charCount || 0
        ]]);
        
        // Keep to 100 rows to safely cache last 30-60 apps
        if(appSheet.getLastRow() > 101) {
            appSheet.deleteRow(102);
        }
    };

    // --- ACTIONS ---
    
    // 1. LIVE LEAD WEBHOOK
    if (params.type === 'new_lead') {
        const counts = updateGlobalCounter(true);
        
        const scoreSheet = ss.getSheetByName('LeadScores');
        scoreSheet.insertRowBefore(2); // Push down logic
        scoreSheet.getRange('A2:H2').setValues([[
            displayTimestamp,
            params.leadName || 'Unknown',
            params.leadId || 'N/A',
            params.city || 'Unknown',
            params.score1 || 0,
            params.score2 || 0,
            params.score3 || 0,
            params.score4 || 0
        ]]);
        // Keep to 100 rows to allow safely keeping "last 30 days" worth while capping it
        if(scoreSheet.getLastRow() > 101) {
            scoreSheet.deleteRow(102);
        }
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, count: counts.leads })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. LIVE APPLICATION WEBHOOK
    if (params.type === 'new_application') {
        const counts = updateGlobalCounter(false);
        insertApplicationRecord(params, displayTimestamp);
        return ContentService.createTextOutput(JSON.stringify({ success: true, count: counts.apps })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // BACKFILL APPLICATION COMMAND
    if (params.type === 'backfill_application') {
        insertApplicationRecord(params, params.overrideTimestamp || displayTimestamp);
        return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. BACKFILL COMMANDS (For our node script)
    if (params.type === 'backfill_global') {
        const counterSheet = ss.getSheetByName('TotalCounters');
        counterSheet.getRange('A2:C2').setValues([[params.leads, params.applications, isoTimestamp]]);
    }
    
    if (params.type === 'backfill_daily') {
        const dailySheet = ss.getSheetByName('DailyTotals');
        dailySheet.appendRow([params.date, params.leads, params.applications]); 
        // Note: For backfills via script, we want to append them chronologically ascending, 
        // to manually control order, or we can insert top. We'll handle this in the JS script properly.
    }
    
    if (params.type === 'backfill_score') {
         const scoreSheet = ss.getSheetByName('LeadScores');
         // We'll append for backfill to keep control over order. JS script will handle it.
         scoreSheet.appendRow([params.date, params.leadName || '', params.leadId || '', params.city || '', params.score1, params.score2, params.score3, params.score4]);
    }
    
    if (params.type === 'reset') {
         const counterSheet = ss.getSheetByName('TotalCounters');
         counterSheet.getRange('A2:C2').setValues([[0, 0, isoTimestamp]]);
         return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- MIDNIGHT CRON: Update DailyTotals ---
// Set up a daily trigger: Triggers > Add Trigger > updateDailyTotalsAtMidnight > Time-driven > Day timer > Midnight to 1am
function updateDailyTotalsAtMidnight() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const today = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  
  // Count leads for today from LeadScores tab
  const scoreSheet = ss.getSheetByName('LeadScores');
  const scoreData = scoreSheet.getDataRange().getValues();
  let leadCount = 0;
  for (let i = 1; i < scoreData.length; i++) {
    const cellDate = scoreData[i][0]; // Column A = date string like "24/02/26 - 10:33"
    const dateStr = String(cellDate);
    // Parse "dd/mm/yy - hh:mm" format to compare with today
    const parts = dateStr.split(' - ')[0].split('/');
    if (parts.length === 3) {
      const rowDate = '20' + parts[2] + '-' + parts[1] + '-' + parts[0]; // "2026-02-24"
      if (rowDate === today) leadCount++;
    }
  }
  
  // Count applications for today from Applications tab
  const appSheet = ss.getSheetByName('Applications');
  const appData = appSheet.getDataRange().getValues();
  let appCount = 0;
  for (let i = 1; i < appData.length; i++) {
    const cellDate = appData[i][0];
    const dateStr = String(cellDate);
    const parts = dateStr.split(' - ')[0].split('/');
    if (parts.length === 3) {
      const rowDate = '20' + parts[2] + '-' + parts[1] + '-' + parts[0];
      if (rowDate === today) appCount++;
    }
  }
  
  // Insert one row at top of DailyTotals
  const dailySheet = ss.getSheetByName('DailyTotals');
  dailySheet.insertRowBefore(2);
  dailySheet.getRange('A2:C2').setValues([[today, leadCount, appCount]]);
  
  // Trim old rows (keep 60 days max)
  if (dailySheet.getMaxRows() > 61) dailySheet.deleteRow(62);
}
```

3. Click **Deploy > Manage Deployments**.
4. Click the Pencil icon, create a **New version**, and click **Deploy**.

### Step 3: Set up the Midnight Trigger
1. In Apps Script editor, click **Triggers** (clock icon in left sidebar)
2. Click **+ Add Trigger**
3. Configure:
   - Function: `updateDailyTotalsAtMidnight`
   - Deployment: `Head`
   - Event source: `Time-driven`
   - Type: `Day timer`
   - Time: `Midnight to 1am`
4. Click **Save**

https://script.google.com/macros/s/AKfycbwNldqib0fL2UXLirWgGVaZjAzjBI3theW3hGti2a0pdnB2_b5dNAKhZZoEGFWbxfD6/exec
