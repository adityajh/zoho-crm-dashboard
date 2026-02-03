# Zoho CRM Webhook Setup Guide

This guide will help you configure webhooks in Zoho CRM to send data to your Working BBA Campaign Dashboard.

## Prerequisites

- Access to Zoho CRM with admin privileges
- Your dashboard server must be publicly accessible (use ngrok for local testing or deploy to a hosting service)

## Webhook URLs

Once your server is running and publicly accessible, you'll have two webhook endpoints:

- **New Lead Webhook**: `https://your-domain.com/webhook/lead`
- **Application Form Webhook**: `https://your-domain.com/webhook/application`

## Setting Up Webhooks in Zoho CRM

### For New Leads

1. **Navigate to Webhooks**
   - Go to **Setup** (gear icon) → **Automation** → **Actions** → **Webhooks**

2. **Create New Webhook**
   - Click **Configure Webhook**
   - Name: `Working BBA - New Lead`
   - URL to Notify: `https://your-domain.com/webhook/lead`
   - Method: **POST**

3. **Configure Request**
   - Content Type: `application/json`
   - You can send any data you want - the webhook will increment the counter regardless of payload

4. **Save the Webhook**

5. **Create Workflow Rule**
   - Go to **Setup** → **Automation** → **Workflow Rules**
   - Module: **Leads**
   - Rule Name: `Trigger New Lead Counter`
   - When: **A record is created**
   - Condition: All Leads (or add specific criteria if needed)
   - Instant Actions: Select the webhook you created above

### For Application Forms Filled

1. **Create Second Webhook**
   - Name: `Working BBA - Application Filled`
   - URL to Notify: `https://your-domain.com/webhook/application`
   - Method: **POST**
   - Content Type: `application/json`

2. **Create Workflow Rule**
   - Module: **Leads** (or custom module if you track applications separately)
   - Rule Name: `Trigger Application Counter`
   - When: **A record is created or edited**
   - Condition: Add criteria like "Application Status = Submitted" or similar field
   - Instant Actions: Select the application webhook

## Testing Your Webhooks

### Using Zoho CRM Test Feature

1. In the webhook configuration, use the **Test** button
2. Send a test request
3. Check your dashboard - the counter should increment

### Manual Testing with curl

```bash
# Test lead webhook
curl -X POST https://your-domain.com/webhook/lead \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Test application webhook
curl -X POST https://your-domain.com/webhook/application \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Check Dashboard

Open your dashboard at `https://your-domain.com` and verify:
- Counters are displaying correctly
- Numbers increment when webhooks are triggered
- Last updated timestamp shows recent activity

## Local Development with ngrok

If you're testing locally before deployment:

1. **Install ngrok**: https://ngrok.com/download

2. **Start your server**:
   ```bash
   npm start
   ```

3. **Create ngrok tunnel**:
   ```bash
   ngrok http 3000
   ```

4. **Use ngrok URL** in Zoho webhooks:
   - Example: `https://abc123.ngrok.io/webhook/lead`

## Deployment Options

### Option 1: Vercel (Recommended for Node.js)

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts
4. Use the provided URL for webhooks

### Option 2: Railway

1. Sign up at https://railway.app
2. Create new project from GitHub repo
3. Railway will auto-detect Node.js and deploy
4. Use the provided domain for webhooks

### Option 3: Heroku

1. Install Heroku CLI
2. Create new app: `heroku create your-app-name`
3. Deploy: `git push heroku main`
4. Use `https://your-app-name.herokuapp.com` for webhooks

## Troubleshooting

### Webhook Not Triggering

- Verify the webhook URL is correct and publicly accessible
- Check Zoho CRM workflow rules are active
- Review Zoho CRM execution logs in Setup → Automation → Workflow Rules

### Counter Not Incrementing

- Check server logs for incoming webhook requests
- Verify the `data.json` file is being updated
- Ensure file write permissions are correct

### Dashboard Not Updating

- Check browser console for JavaScript errors
- Verify `/api/stats` endpoint is returning data
- Ensure auto-refresh is working (check every 5 seconds)

## Security Considerations

Currently, the webhooks accept any POST request. For production use, consider:

1. **API Key Authentication**: Add a secret key that Zoho must send
2. **IP Whitelisting**: Only accept requests from Zoho CRM IP addresses
3. **Request Signature**: Verify webhook signatures if Zoho provides them

Contact your developer to implement these security measures.

## Support

For issues with:
- **Zoho CRM**: Contact Zoho Support or check their documentation
- **Dashboard**: Check server logs and browser console for errors
- **Deployment**: Refer to your hosting provider's documentation
