# Zoho CRM Webhook Setup Guide

This guide has been customized for your live deployment.

## 🚀 Live Webhook URLs

Use these exact URLs when configuring webhooks in Zoho CRM:

- **New Lead Webhook:**
  ```
  https://zoho-crm-dashboard-nine.vercel.app/api/webhook/lead
  ```

- **Application Form Webhook:**
  ```
  https://zoho-crm-dashboard-nine.vercel.app/api/webhook/application
  ```

---

## Setting Up Webhooks in Zoho CRM

### 1. Configure the "New Lead" Webhook

1.  **Navigate to Webhooks**
    - Go to **Setup** (gear icon) → **Automation** → **Actions** → **Webhooks**.

2.  **Create Webhook**
    - Click **Configure Webhook**.
    - **Name:** `Working BBA - New Lead`
    - **URL to Notify:** `https://zoho-crm-dashboard-nine.vercel.app/api/webhook/lead`
    - **Method:** `POST`
    - **Secured Webhook:** No (unless you implement auth later)
    - **Event:** leave as default

3.  **Body/Payload**
    - **Type**: `application/json` (Raw) or Form-Data.
    - The dashboard simply counts the *event*, so the actual data content doesn't drastically matter for the counter, but sending standard Lead data is good practice.

4.  **Save** the Webhook.

5.  **Create Workflow Rule**
    - Go to **Setup** → **Automation** → **Workflow Rules**.
    - **Module:** `Leads`
    - **Rule Name:** `Trigger New Lead Counter`
    - **When:** `On Record Creation`
    - **Condition:** All Leads (or matching "Working BBA" program criteria)
    - **Instant Actions:** Select the `Working BBA - New Lead` webhook you just created.
    - **Save** and **Activate** the rule.

### 2. Configure the "Application Filled" Webhook

1.  **Create Second Webhook**
    - Go back to **Webhooks** → **Configure Webhook**.
    - **Name:** `Working BBA - Application Filled`
    - **URL to Notify:** `https://zoho-crm-dashboard-nine.vercel.app/api/webhook/application`
    - **Method:** `POST`

2.  **Create Workflow Rule**
    - **Module:** `Leads` (or `Applications` if you have a custom module).
    - **Rule Name:** `Trigger Application Counter`
    - **When:** `On Record Edit` (or Creation, depending on your flow).
    - **Condition:** e.g., `Application Status` is `Submitted` or `Form Filled`.
    - **Instant Actions:** Select the `Working BBA - Application Filled` webhook.
    - **Save** and **Activate**.

---

## Testing Your Integration

### 1. Manual Test (Command Line)
You can verify the webhooks are working from your terminal:

```bash
# Test Lead Counter
curl -X POST https://zoho-crm-dashboard-nine.vercel.app/api/webhook/lead

# Test Application Counter
curl -X POST https://zoho-crm-dashboard-nine.vercel.app/api/webhook/application
```

### 2. Live Test
1.  Open your dashboard: [https://zoho-crm-dashboard-nine.vercel.app/index.html](https://zoho-crm-dashboard-nine.vercel.app/index.html)
2.  Go to Zoho CRM and create a dummy Lead.
3.  Wait 5-10 seconds (the dashboard auto-refreshes).
4.  You should see the "Total Leads" counter increment!

## Troubleshooting

-   **Counter didn't move?**
    -   Refresh the dashboard page.
    -   Check Zoho CRM **Audit Log** or Workflow history to ensure the webhook fired.
    -   Check the dashboard **Health Link**: `https://zoho-crm-dashboard-nine.vercel.app/api/health` to ensure the server is responding.

-   **Note on Data Persistence**
    -   Since this is running on Serverless Functions without a database, **data resets if the server "sleeps" (cold start) or redeploys**.
    -   The dashboard is perfect for monitoring *live* campaign activity during the day.
    -   For permanent long-term storage, we would need to connect a database (like MongoDB or Vercel KV) in the future.
