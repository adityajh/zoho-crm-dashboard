# Zoho CRM Dashboard

A lightweight, real-time dashboard for tracking Working BBA admission campaign metrics from Zoho CRM webhooks.

## Features

- 📊 **Real-time Tracking**: Live counters for leads and application forms
- 🎨 **Modern UI**: Premium dark theme with smooth animations
- 🔄 **Auto-refresh**: Updates every 5 seconds automatically
- 📱 **Responsive**: Works perfectly on desktop and mobile
- 💾 **Persistent Storage**: JSON file-based data storage
- 🚀 **Lightweight**: No database required, easy to deploy

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 3. Open Dashboard

Navigate to `http://localhost:3000` in your browser to view the dashboard.

## API Endpoints

### Webhooks (POST)

- **`/webhook/lead`** - Increments lead counter
- **`/webhook/application`** - Increments application counter

### API (GET)

- **`/api/stats`** - Returns current statistics
  ```json
  {
    "leads": 42,
    "applications": 15,
    "lastUpdated": "2026-02-03T11:53:06.000Z"
  }
  ```

- **`/api/health`** - Health check endpoint

### Admin (POST)

- **`/api/reset`** - Resets all counters to zero (for testing)

## Testing

### Test Webhooks Locally

```bash
# Test lead webhook
curl -X POST http://localhost:3000/webhook/lead \
  -H "Content-Type: application/json" \
  -d '{}'

# Test application webhook
curl -X POST http://localhost:3000/webhook/application \
  -H "Content-Type: application/json" \
  -d '{}'

# Check stats
curl http://localhost:3000/api/stats

# Reset counters
curl -X POST http://localhost:3000/api/reset
```

## Zoho CRM Integration

See [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) for detailed instructions on:
- Configuring webhooks in Zoho CRM
- Setting up workflow rules
- Testing the integration
- Deployment options

## Deployment

### Environment Variables

- `PORT` - Server port (default: 3000)

### Recommended Platforms

1. **Vercel** - Easiest for Node.js apps
2. **Railway** - Auto-deployment from Git
3. **Heroku** - Classic PaaS option
4. **DigitalOcean App Platform** - Full control

See [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) for deployment guides.

## Project Structure

```
zoho-crm-dashboard/
├── server.js              # Express server with webhook endpoints
├── package.json           # Node.js dependencies
├── data.json             # Persistent counter storage (auto-created)
├── public/
│   ├── index.html        # Dashboard UI
│   ├── styles.css        # Styling
│   └── script.js         # Client-side logic
├── WEBHOOK_SETUP.md      # Zoho CRM integration guide
└── README.md             # This file
```

## Technology Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: JSON file
- **Styling**: Custom CSS with modern design

## License

MIT

## Support

For issues or questions about:
- Dashboard functionality: Check server logs
- Zoho CRM integration: See WEBHOOK_SETUP.md
- Deployment: Refer to your hosting provider's docs
