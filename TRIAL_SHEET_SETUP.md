# Trial Sheet Setup for V1.2

Please follow these steps to create our isolated testing environment. Once you give me the Web App URL, I can start configuring the backend!

## Step 1: Create the Trial Sheet
1. Open your current live `Zoho CRM Dashboard Data` Google Sheet.
2. Click **File > Make a copy**.
3. Name the new sheet: `Zoho CRM Dashboard Data v1.2 Trial`.

## Step 2: Set Up the Tabs
In your new Trial Sheet, ensure you have these **two tabs** exactly named:
1. `DailyTotals` (Rename `Sheet1` to this, or create it if missing)
2. `LeadScores`

### `DailyTotals` Tab Headers (Row 1):
| A | B | C |
|---|---|---|
| Date | Leads | Applications |

*(You can leave row 2 empty, the script will add data)*

### `LeadScores` Tab Headers (Row 1):
| A | B | C | D | E |
|---|---|---|---|---|
| Date | Score1 | Score2 | Score3 | Score4 |

*(Again, leave row 2 empty)*

## Step 3: Deploy the New Apps Script
1. In the Trial Sheet, click **Extensions > Apps Script**.
2. Delete the old code, and paste this entire new code:

```javascript
// ====== v1.2 Trial Apps Script ======

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get Daily Totals (Last 30 days ideally, but we'll send all for now and filter in Node)
  const dailySheet = ss.getSheetByName('DailyTotals');
  const dailyData = dailySheet.getDataRange().getValues();
  let dailyTotals = [];
  if (dailyData.length > 1) {
    // Skip header row
    for(let i=1; i<dailyData.length; i++) {
        dailyTotals.push({
            date: dailyData[i][0],
            leads: parseInt(dailyData[i][1]) || 0,
            applications: parseInt(dailyData[i][2]) || 0
        });
    }
  }

  // 2. Get Last 10 Lead Scores
  const scoreSheet = ss.getSheetByName('LeadScores');
  const scoreData = scoreSheet.getDataRange().getValues();
  let last10Scores = [];
  if (scoreData.length > 1) {
     const startRow = Math.max(1, scoreData.length - 10);
     for(let i=startRow; i<scoreData.length; i++) {
         last10Scores.push({
             date: scoreData[i][0],
             score1: parseFloat(scoreData[i][1]) || 0,
             score2: parseFloat(scoreData[i][2]) || 0,
             score3: parseFloat(scoreData[i][3]) || 0,
             score4: parseFloat(scoreData[i][4]) || 0
         });
     }
  }

  // Get current legacy totals for existing UI (fallback)
  let currentLeads = 0;
  let currentApps = 0;
  if (dailyData.length > 1) {
      currentLeads = parseInt(dailyData[dailyData.length-1][1]) || 0;
      currentApps = parseInt(dailyData[dailyData.length-1][2]) || 0;
  }

  return ContentService.createTextOutput(JSON.stringify({
    leads: currentLeads,
    applications: currentApps,
    lastUpdated: new Date().toISOString(),
    dailyHistory: dailyTotals,
    recentScores: last10Scores
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const params = JSON.parse(e.postData.contents);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // ACTION 1: Update Daily Totals
    if (params.type === 'counter_update') {
        const dailySheet = ss.getSheetByName('DailyTotals');
        const data = dailySheet.getDataRange().getValues();
        let updated = false;
        
        // Check if today exists
        if (data.length > 1) {
            const lastRowIndex = data.length - 1;
            const lastRowDateStr = new Date(data[lastRowIndex][0]).toISOString().split('T')[0];
            
            if (lastRowDateStr === today) {
                // Update today's row
                dailySheet.getRange(lastRowIndex + 1, 2).setValue(params.leads);
                dailySheet.getRange(lastRowIndex + 1, 3).setValue(params.applications);
                updated = true;
            }
        }
        
        // If today doesn't exist, append new row
        if (!updated) {
            dailySheet.appendRow([today, params.leads, params.applications]);
        }
    }
    
    // ACTION 2: Append New Lead Score
    if (params.type === 'new_lead_score') {
        const scoreSheet = ss.getSheetByName('LeadScores');
        scoreSheet.appendRow([
            new Date().toISOString(),
            params.score1 || 0,
            params.score2 || 0,
            params.score3 || 0,
            params.score4 || 0
        ]);
        
        // Optional: Keep sheet size manageable by deleting oldest if > 100 rows
        if(scoreSheet.getLastRow() > 100) {
            scoreSheet.deleteRow(2);
        }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Data recorded successfully"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click **Deploy > New deployment**.
4. Select type **Web app**, set access to **Anyone**. 
5. Click **Deploy** and **copy the new Web App URL**.

---

**Please paste the new Web App URL here, along with the 4 Zoho variable names for the scores!**
