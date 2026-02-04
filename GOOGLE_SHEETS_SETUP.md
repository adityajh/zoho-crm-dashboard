# Google Sheets Setup Guide

This guide will walk you through setting up Google Sheets as the persistent storage for your Zoho CRM Dashboard.

## Part 1: Google Cloud Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it: `Zoho CRM Dashboard`
4. Click **Create**

### Step 2: Enable Google Sheets API

1. In your project, go to **APIs & Services** → **Library**
2. Search for `Google Sheets API`
3. Click on it and press **Enable**

### Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in:
   - **Service account name**: `zoho-dashboard-bot`
   - **Service account ID**: (auto-filled)
4. Click **Create and Continue**
5. Skip the optional steps, click **Done**

### Step 4: Download JSON Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Click **Create** - a JSON file will download
6. **Keep this file safe!** You'll need values from it.

---

## Part 2: Google Sheet Setup

### Step 1: Create Your Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a **New Blank Spreadsheet**
3. Name it: `Zoho CRM Dashboard Data`

### Step 2: Set Up Structure

In **Sheet1**, add these headers in Row 1:

| A | B | C |
|---|---|---|
| Leads | Applications | LastUpdated |

In Row 2, initialize with zeros:

| A | B | C |
|---|---|---|
| 0 | 0 | |

### Step 3: Share with Service Account

1. Click the **Share** button (top right)
2. Paste the **service account email** from your JSON file
   - It looks like: `zoho-dashboard-bot@project-name.iam.gserviceaccount.com`
3. Give it **Editor** access
4. **Uncheck** "Notify people"
5. Click **Share**

### Step 4: Get Sheet ID

From your sheet URL:
```
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
```
Copy the `SHEET_ID_HERE` part.

---

## Part 3: Vercel Configuration

### Add Environment Variables

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `zoho-crm-dashboard` project
3. Go to **Settings** → **Environment Variables**
4. Add these 3 variables:

#### Variable 1: GOOGLE_SERVICE_ACCOUNT_EMAIL
- **Name**: `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **Value**: The `client_email` from your JSON file
- **Environment**: Production, Preview, Development

#### Variable 2: GOOGLE_PRIVATE_KEY
- **Name**: `GOOGLE_PRIVATE_KEY`
- **Value**: The `private_key` from your JSON file (entire value including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
- **Environment**: Production, Preview, Development

#### Variable 3: GOOGLE_SHEET_ID
- **Name**: `GOOGLE_SHEET_ID`
- **Value**: The Sheet ID you copied earlier
- **Environment**: Production, Preview, Development

### Redeploy

After adding the environment variables, Vercel will automatically redeploy your app with the new configuration.

---

## Testing

Once deployed:

1. Trigger a webhook (via Zoho or curl)
2. Check your Google Sheet - you should see the numbers update!
3. Refresh your dashboard - it will now show the persisted data

**Your data is now safe!** Even if Vercel restarts the server, your counts will persist in the Google Sheet.
