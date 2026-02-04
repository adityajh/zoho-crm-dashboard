# Google Apps Script Setup Guide

This guide shows you how to set up Google Sheets persistence using Google Apps Script - **no Google Cloud setup required!**

## Part 1: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a **New Blank Spreadsheet**
3. Name it: `Zoho CRM Dashboard Data`

### Set Up Structure

In **Sheet1**, add these headers in Row 1:

| A | B | C |
|---|---|---|
| Leads | Applications | LastUpdated |

In Row 2, initialize with zeros:

| A | B | C |
|---|---|---|
| 0 | 0 | |

---

## Part 2: Create Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any existing code
3. Paste the following code:

```javascript
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const data = sheet.getRange('A2:C2').getValues()[0];
  
  return ContentService.createTextOutput(JSON.stringify({
    leads: parseInt(data[0]) || 0,
    applications: parseInt(data[1]) || 0,
    lastUpdated: data[2] || new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
    const params = JSON.parse(e.postData.contents);
    
    const leads = parseInt(params.leads) || 0;
    const applications = parseInt(params.applications) || 0;
    const lastUpdated = new Date().toISOString();
    
    sheet.getRange('A2:C2').setValues([[leads, applications, lastUpdated]]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      leads: leads,
      applications: applications,
      lastUpdated: lastUpdated
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click **Save** (💾 icon)
5. Name the project: `Zoho Dashboard API`

---

## Part 3: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure:
   - **Description**: `Zoho Dashboard Data API`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
5. Click **Deploy**
6. **Copy the Web App URL** - it looks like:
   ```
   https://script.google.com/macros/s/XXXXX/exec
   ```
7. Click **Done**

---

## Part 4: Configure Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `zoho-crm-dashboard` project
3. Go to **Settings** → **Environment Variables**
4. Add **ONE** variable:

**GOOGLE_APPS_SCRIPT_URL**
- **Name**: `GOOGLE_APPS_SCRIPT_URL`
- **Value**: The Web App URL you copied (e.g., `https://script.google.com/macros/s/XXXXX/exec`)
- **Environment**: Production, Preview, Development

5. Save and wait for automatic redeployment

---

## Testing

Once deployed:

1. Trigger a webhook (via Zoho or curl)
2. Check your Google Sheet - you should see the numbers update!
3. Your data is now permanently stored

**Benefits of this approach:**
- ✅ No Google Cloud setup
- ✅ No service accounts or JSON keys
- ✅ Simple one-URL configuration
- ✅ Easy to debug (you can see Apps Script logs)
