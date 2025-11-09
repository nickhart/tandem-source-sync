# Tandem Source Sync

An automated CSV report service for Tandem Diabetes Source data. Self-hosted on Vercel's free tier, this service automatically downloads your diabetes data from Tandem Source and makes it available via a REST API for use with iOS apps or other integrations.

## Features

- 🤖 **Automated Data Sync** - Runs every 12 hours automatically via Vercel Cron
- 📦 **Cloud Storage** - Reports stored in Vercel Blob Storage
- 🔐 **Secure API** - API key authentication for all endpoints
- 🎨 **Web Dashboard** - View sync status and download reports
- 📱 **iOS Integration** - REST API designed for mobile app consumption
- 🆓 **Free Hosting** - Runs on Vercel's free tier

## Architecture

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Automation**: Playwright + Chromium (serverless)
- **Storage**: Vercel Blob
- **Hosting**: Vercel
- **Styling**: Tailwind CSS

## Prerequisites

Before you begin, you'll need:

- A [Vercel](https://vercel.com) account (free tier works)
- A [GitHub](https://github.com) account
- Tandem Diabetes Source account credentials
- Node.js 18+ (only for local development/testing)

## Quick Start Deployment

### Step 1: Push to GitHub

If you haven't already, push this project to your GitHub repository:

```bash
# Initialize git repository (if not already initialized)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Tandem Source Sync"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/tandem-source-sync.git

# Push to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 2: Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. Find your `tandem-source-sync` repository in the list
4. Click **Import**
5. Leave the default settings and click **Deploy**

Vercel will build and deploy your project. This initial deployment will show the Setup Wizard (since no environment variables are configured yet).

### Step 3: Visit Setup Wizard

After deployment completes:

1. Click **Visit** to open your deployed site (e.g., `https://your-project.vercel.app`)
2. You'll see the **Setup Wizard**
3. Click **Generate API Key** and copy it to a secure location
4. **Important**: Save this API key - you'll need it for your iOS app and Vercel configuration

### Step 4: Configure Environment Variables

Back in Vercel:

1. Go to your project → **Settings** → **Environment Variables**
2. Add the following variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `API_KEY` | *your-generated-key* | The API key you generated in Step 3 |
| `DASHBOARD_PASSWORD` | *your-secure-password* | **Recommended**: Password to protect web dashboard |
| `TANDEM_USERNAME` | *your-email@example.com* | Your Tandem Source login email |
| `TANDEM_PASSWORD` | *your-password* | Your Tandem Source password |
| `REPORT_DAYS` | `2` | Number of days of data to download (default: 2) |
| `CRON_SECRET` | *any-random-string* | Optional: Secret for cron endpoint security |

**Important**: Make sure to select all environments (Production, Preview, Development) for each variable.

### Step 5: Enable Vercel Blob Storage

1. In your Vercel project settings, go to **Storage**
2. Click **Create Database** → **Blob**
3. Follow the prompts to enable Blob storage
4. Vercel will automatically add `BLOB_READ_WRITE_TOKEN` to your environment variables

### Step 6: Redeploy

After adding all environment variables:

1. Go to **Deployments** tab
2. Click the **•••** menu on the latest deployment
3. Select **Redeploy**
4. Wait for deployment to complete

### Step 7: Verify Setup

1. Visit your site again
2. You should now see the **Dashboard** instead of the setup wizard
3. Click **Trigger Sync Now** to test the scraper
4. Check **Deployments** → **Functions** to monitor sync progress in the logs

🎉 **Your automated Tandem Source sync service is now running!**

## API Documentation

All API endpoints require authentication via API key.

### Authentication

Include your API key in requests using either:

**Bearer Token (Recommended)**:
```bash
Authorization: Bearer your-api-key-here
```

**Header**:
```bash
X-API-Key: your-api-key-here
```

### Endpoints

#### `GET /api/status`
Get service status and last sync information.

**Response**:
```json
{
  "success": true,
  "data": {
    "configured": true,
    "lastSyncTime": "2024-01-15T12:00:00.000Z",
    "lastSyncSuccess": true,
    "lastSyncError": null,
    "reportCount": 5,
    "nextScheduledSync": "2024-01-16T00:00:00.000Z"
  }
}
```

#### `GET /api/reports`
List all available reports with metadata.

**Response**:
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "filename": "tandem-report-2024-01-15-120000.csv",
        "url": "https://blob.vercel-storage.com/...",
        "size": 45678,
        "uploadedAt": "2024-01-15T12:00:00.000Z",
        "downloadedAt": "2024-01-15T12:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

#### `GET /api/reports/[filename]`
Download a specific CSV report.

**Example**:
```bash
curl -H "Authorization: Bearer your-api-key" \
  https://your-app.vercel.app/api/reports/tandem-report-2024-01-15-120000.csv \
  -o report.csv
```

#### `POST /api/sync`
Trigger an immediate sync operation (in addition to scheduled syncs).

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "filename": "tandem-report-2024-01-15-120000.csv",
    "timestamp": "2024-01-15T12:00:00.000Z",
    "reportDays": 2
  }
}
```

### Example: iOS Integration

```swift
// Configure API client
let baseURL = "https://your-app.vercel.app"
let apiKey = "your-api-key"

// Fetch reports
func fetchReports() async throws -> [Report] {
    var request = URLRequest(url: URL(string: "\(baseURL)/api/reports")!)
    request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")

    let (data, _) = try await URLSession.shared.data(for: request)
    let response = try JSONDecoder().decode(ReportsResponse.self, from: data)
    return response.data.reports
}
```

## Local Development

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tandem-source-sync.git
cd tandem-source-sync
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

4. Edit `.env.local` with your credentials:
```env
API_KEY=your-local-api-key
TANDEM_USERNAME=your-email@example.com
TANDEM_PASSWORD=your-password
REPORT_DAYS=2
```

5. Install Playwright browsers (for local testing):
```bash
npx playwright install chromium
```

### Running Locally

Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

### Testing the Scraper

You can test the scraper without deploying by creating a test script:

```typescript
// scripts/test-scraper.ts
import { scrapeTandemSource } from './src/lib/tandem-scraper';

async function test() {
  const result = await scrapeTandemSource({
    username: process.env.TANDEM_USERNAME!,
    password: process.env.TANDEM_PASSWORD!,
    reportDays: 2,
  });

  console.log('Result:', result);

  if (result.success && result.csvBuffer) {
    console.log('CSV size:', result.csvBuffer.length, 'bytes');
  }
}

test();
```

## Customization

### Change Sync Frequency

Edit `vercel.json` to adjust the cron schedule:

```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 */6 * * *"  // Every 6 hours instead of 12
  }]
}
```

Cron syntax guide:
- `0 */12 * * *` - Every 12 hours
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight
- `0 0,12 * * *` - Daily at midnight and noon

After changing, commit and push to trigger a new deployment.

### Adjust Report Days

Change the `REPORT_DAYS` environment variable in Vercel settings to download more or fewer days of data. Note that the most recent day's data is always incomplete.

## Troubleshooting

### Sync Failures

**Check Vercel Logs**:
1. Go to your Vercel project
2. Click **Deployments** → Latest deployment → **Functions**
3. Look for `/api/cron` or `/api/sync` logs

**Common Issues**:

1. **Login Failed**
   - Verify `TANDEM_USERNAME` and `TANDEM_PASSWORD` are correct
   - Try logging in manually at https://source.tandemdiabetes.com
   - Check if Tandem has changed their login page structure

2. **Timeout Errors**
   - The scraper has a 3-minute timeout by default
   - Tandem Source may be slow or down
   - Check Vercel function timeout limits (5 min max on Pro)

3. **Chromium Not Found**
   - Ensure `@sparticuz/chromium` is installed
   - Check Vercel build logs for installation errors

4. **Blob Storage Errors**
   - Verify Blob storage is enabled in Vercel
   - Check `BLOB_READ_WRITE_TOKEN` is set

### Setup Wizard Still Showing

If you've configured all environment variables but still see the setup wizard:

1. Verify all required env vars are set in **Production** environment
2. Redeploy the application
3. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+F5)
4. Check Vercel logs for any startup errors

### API Returns 401 Unauthorized

- Verify you're sending the API key in the `Authorization` header or `X-API-Key` header
- Check that the API key matches the one in Vercel environment variables
- Ensure the API key has no extra spaces or line breaks

## Security Notes

- **API Key**: Keep your API key secret. Don't commit it to version control. Required for REST API access from your iOS app.
- **Dashboard Password**: **Strongly recommended** to set `DASHBOARD_PASSWORD` to protect your web dashboard. Without it, anyone who knows your Vercel URL can view your sync status and trigger syncs. With it, you'll need to login before accessing the dashboard.
- **Credentials**: Your Tandem credentials are stored only in Vercel environment variables, which are encrypted at rest.
- **HTTPS**: All traffic uses HTTPS (enforced by Vercel).
- **Single-User**: This service is designed for individual use, not multi-user scenarios.
- **Two-Layer Security**:
  - Dashboard (web UI) protected by `DASHBOARD_PASSWORD`
  - REST API (for iOS app) protected by `API_KEY`

## Data Handling

### Current Day Note

The most recent day's data in any report is always **incomplete** because:
- Data is still being generated throughout the day
- Tandem Source updates continuously as your pump transmits data

That's why the default `REPORT_DAYS` is set to 2 - to ensure yesterday's **complete** data is captured. Your iOS app should account for this when displaying data.

### Report Retention

Reports are stored indefinitely in Vercel Blob Storage. To implement automatic cleanup:

1. Modify `src/lib/blob-storage.ts`
2. Call `cleanupOldReports(keepCount)` in the sync handler
3. Redeploy

Example:
```typescript
// In src/lib/sync-handler.ts, after storing report:
await cleanupOldReports(30); // Keep only last 30 reports
```

## Vercel Free Tier Limits

The service is designed to run within Vercel's free tier:

- **Function Executions**: 100 GB-hours/month
- **Bandwidth**: 100 GB/month
- **Blob Storage**: 1 GB storage
- **Cron Jobs**: Available on free tier

With syncs every 12 hours, you'll use approximately:
- ~60 function executions/month (2 per day × 30 days)
- Each CSV is typically <100 KB
- Well within free tier limits for individual use

## Alternative: Deploy from Template

If this repository is published as a public template, you can also use the "Deploy to Vercel" button:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/tandem-source-sync)

This will:
1. Clone the repository to your GitHub account
2. Automatically import it to Vercel
3. Deploy the project

After deployment, follow Steps 3-7 from the Quick Start guide above to configure your service.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

- Follow existing code style (TypeScript, ESLint)
- Add comments to complex logic
- Update README for new features
- Test locally before submitting PR

## License

MIT License - feel free to use this for your personal diabetes data management.

## Disclaimer

This is an unofficial tool and is not affiliated with or endorsed by Tandem Diabetes Care. Use at your own risk. Always verify data accuracy with official Tandem sources.

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/tandem-source-sync/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/yourusername/tandem-source-sync/issues)
- 📖 **Documentation**: This README

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org) - React framework
- [Playwright](https://playwright.dev) - Browser automation
- [Vercel](https://vercel.com) - Hosting and infrastructure
- [@sparticuz/chromium](https://github.com/Sparticuz/chromium) - Serverless Chromium

---

**Made with ❤️ for the diabetes community**
