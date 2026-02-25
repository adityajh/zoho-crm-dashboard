# Zoho CRM Dashboard V1.2 - System Architecture & Status

**Last Updated:** February 25, 2026

## Overview
This dashboard tracks and visualizes Zoho CRM Leads and Applications for the "Working BBA Campaign". It receives live webhooks from Zoho, stores the data chronologically in a Google Sheet, and presents key metrics (Total Leads, Total Apps, 30-day Daily Trends, and Average Lead Score of the last 10 leads) on a Vercel-hosted frontend.

## 1. The Database (Google Sheets)
The dashboard uses Google Sheets as its primary database. It accesses the sheet via a deployed Google Apps Script URL.
- **Current Spreadsheet:** `Zoho CRM Dashboard Data v1.2` (Trial environment sheet, currently acting as Production).
- **Tab 1: `TotalCounters`**: Stores a single row (`A2:C2`) containing the global running total for `[Leads, Applications, LastUpdatedISO]`.
- **Tab 2: `DailyTotals`**: Stores the chronological 30-day history. Always inserted at row 2 (`insertRowBefore(2)`). Columns: `[Date (yyyy-MM-dd), Leads, Applications]`.
- **Tab 3: `LeadScores`**: Stores the last 100 leads. Columns: `[Date, Name, ID, City, Score1, Score2, Score3, Score4]`.
- **Tab 4: `Applications`**: Stores the last 100 applications (18 columns deep, capturing 5 unique essay fields and a calculated character count).

## 2. The Data Flow & Workflows

### Workflow A: New Lead from Zoho -> Dashboard
1. Zoho CRM Workflow Rule triggers on Lead creation/update.
2. Zoho sends an application/x-www-form-urlencoded POST request to `https://zoho-crm-dashboard-nine.vercel.app/api/webhook/lead`.
3. Vercel `api/index.js` receives it and extracts:
   - Identifiers: `Lead_Name`, `Record_Id`, `City`.
   - Scores: `Lead_Source_Score`, `Lead_Age_Score`, `WA_Qualification_Score`, `Website_Analytics_Score`.
4. Vercel backend sends a JSON POST request to the Apps Script URL with `type: 'new_lead'`.
5. Apps Script increments the count in `TotalCounters`.
6. Apps Script inserts a new row at the top (row 2) of `LeadScores` containing the lead details and 4 scores.
7. Vercel returns `200 OK` to Zoho.

### Workflow B: New Application from Zoho -> Dashboard
1. Zoho sends an application/x-www-form-urlencoded POST request to `https://zoho-crm-dashboard-nine.vercel.app/api/webhook/application`.
2. Vercel `api/index.js` extracts 16 standard fields AND 5 essay fields. It calculates `charCount` by summing the lengths of the 5 essay fields.
3. Vercel posts a JSON payload to Apps Script with `type: 'new_application'`.
4. Apps Script increments the application count in `TotalCounters`.
5. Apps Script inserts a new row at the top (row 2) of `Applications` logging all 18 columns.
6. Vercel returns `200 OK` to Zoho.

### Workflow C: The Midnight Cron (DailyTotals)
To prevent race conditions inside Apps Script from simultaneous webhooks, `DailyTotals` are calculated precisely once per day.
1. Apps Script has a Time-Driven Trigger set to run `updateDailyTotalsAtMidnight()` between Midnight and 1 AM IST every day.
2. The script calculates `targetDate` by taking the execution date and subtracting one day (i.e. 'yesterday').
3. It loops through `LeadScores` and counts every row whose date matches `targetDate`.
4. It loops through `Applications` and counts every row whose date matches `targetDate`.
5. It inserts exactly one new row into `DailyTotals` containing `[Yesterday's Date, Lead Count, App Count]`.

### Workflow D: The Frontend Render (`/api/stats`)
1. User loads the React application in code or `Dashboard.js`/`index.html`.
2. The frontend triggers a `GET` request to `https://zoho-crm-dashboard-nine.vercel.app/api/stats`.
3. Vercel `api/index.js` hits the Apps Script URL (`GET`).
4. Apps Script responds with JSON containing:
   - Global totals from `TotalCounters`
   - The last 30 rows of `DailyTotals` (the daily trend data)
   - The top 10 rows of `LeadScores` (for calculating the moving average)
5. Vercel forwards this JSON to the frontend.
6. Frontend graphs update.

## Known Gotchas & Environment Constraints
- **Apps Script Deployments:** Every single change made to the Google Apps Script (`TRIAL_SHEET_SETUP.md`) completely requires the user to go to Manage Deployments -> Create **New Version** -> Deploy. Simply saving the file in the browser does not update the live webhook!
- **Zoho Payload Format:** Zoho sends POST requests as `application/x-www-form-urlencoded`, entirely unlike standard JSON. Vercel is set up to parse this using `express.urlencoded({ extended: true })`.
- **Environment Variables:** Vercel relies on `GOOGLE_APPS_SCRIPT_URL_V1_2`.
- **Missing Webhooks:** If leads are imported via bulk CSV upload in Zoho, or if they don't exactly match the execution criteria in the Zoho Workflow Rules, Zoho *will not* fire the webhook. If data looks missing on the dashboard, this is the first place to investigate.
- **Race Conditions:** Never attempt to increment `DailyTotals` synchronously during the `new_lead` webhook. The Apps Script environment lacks reliable mutexes across varying HTTP requests. The Midnight Cron approach is the architectural standard for this project.
