# Trial Sheet Setup for V1.2

Please update your Trial Sheet to match the new robust structure. This ensures your data is sorted with the newest records on top, features a dedicated Total Counters tab, and keeps 30 days continuous.

## Step 1: Set Up the Tabs
In your `Zoho CRM Dashboard Data v1.2 Trial` Sheet, ensure you have these **three tabs** exactly named:
1. `TotalCounters`
2. `DailyTotals`
3. `LeadScores`

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
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const params = JSON.parse(e.postData.contents);
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
    // --- HELPERS ---
    const updateGlobalCounter = (isLead) => {
        const counterSheet = ss.getSheetByName('TotalCounters');
        let leads = parseInt(counterSheet.getRange('A2').getValue()) || 0;
        let apps = parseInt(counterSheet.getRange('B2').getValue()) || 0;
        if (isLead) leads += 1;
        else apps += 1;
        counterSheet.getRange('A2:C2').setValues([[leads, apps, timestamp]]);
        return { leads, apps };
    };

    const updateDailyCounter = (isLead) => {
        const dailySheet = ss.getSheetByName('DailyTotals');
        const data = dailySheet.getDataRange().getValues();
        let updated = false;
        
        // If row 2 is today, update it
        if (data.length > 1) {
            const row2DateStr = new Date(data[1][0]).toISOString().split('T')[0];
            if (row2DateStr === today) {
                let currentLeads = parseInt(data[1][1]) || 0;
                let currentApps = parseInt(data[1][2]) || 0;
                if(isLead) dailySheet.getRange(2, 2).setValue(currentLeads + 1);
                else dailySheet.getRange(2, 3).setValue(currentApps + 1);
                updated = true;
            }
        }
        
        // If row 2 is NOT today, insert a new row 2 pushing everything down
        if (!updated) {
            dailySheet.insertRowBefore(2);
            dailySheet.getRange('A2:C2').setValues([[today, isLead ? 1 : 0, isLead ? 0 : 1]]);
            // Trim old days (keep 60 rows for buffer)
            if(dailySheet.getMaxRows() > 61) dailySheet.deleteRow(62);
        }
    };

    // --- ACTIONS ---
    
    // 1. LIVE LEAD WEBHOOK
    if (params.type === 'new_lead') {
        const counts = updateGlobalCounter(true);
        updateDailyCounter(true);
        
        const scoreSheet = ss.getSheetByName('LeadScores');
        scoreSheet.insertRowBefore(2); // Push down logic
        scoreSheet.getRange('A2:H2').setValues([[
            timestamp,
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
        updateDailyCounter(false);
        return ContentService.createTextOutput(JSON.stringify({ success: true, count: counts.apps })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. BACKFILL COMMANDS (For our node script)
    if (params.type === 'backfill_global') {
        const counterSheet = ss.getSheetByName('TotalCounters');
        counterSheet.getRange('A2:C2').setValues([[params.leads, params.applications, timestamp]]);
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
         counterSheet.getRange('A2:C2').setValues([[0, 0, timestamp]]);
         return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click **Deploy > Manage Deployments**.
4. Click the Pencil icon, create a **New version**, and click **Deploy**.
https://script.google.com/macros/s/AKfycbwNldqib0fL2UXLirWgGVaZjAzjBI3theW3hGti2a0pdnB2_b5dNAKhZZoEGFWbxfD6/exec
