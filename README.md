# WhatsApp Bot REST API

## Overview
This project is a REST API for scheduling and sending WhatsApp messages using Google Sheets as the data source. It supports instant and scheduled messaging, persistent WhatsApp login, and automatic background scheduling using node-cron.

---

## Why Use `payload.json` for API Testing?

**On Windows/PowerShell, using a `payload.json` file for your API requests is recommended.**

- PowerShell and Windows command line can be tricky with quotes and escaping when passing JSON directly in a command (especially with `curl` or `Invoke-RestMethod`).
- Using a file avoids escaping issues, is easier to edit, and is more reliable for repeated or team-based testing.
- For Linux/macOS, you can use inline JSON in commands, but for Windows, a file is much more robust.

**Example (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/send-now -Method Post -Headers @{"Authorization"="Bearer YOUR_TOKEN"} -ContentType "application/json" -Body (Get-Content -Raw -Path payload.json)
```

**Example (Linux/macOS):**
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"sessionId":"...","sheetName":"...","mode":"scheduled"}' http://localhost:3000/send-now
```

**Summary Table:**

| Method           | Pros                        | Cons                        | Best For                |
|------------------|----------------------------|-----------------------------|-------------------------|
| `payload.json`   | Easy, reusable, no escaping| Needs extra file            | Windows/PowerShell, teams|
| Inline JSON      | Quick, no file needed      | Escaping is tricky, error-prone | Linux/macOS, quick tests|

---

## Features
- **REST API** for WhatsApp messaging
- **Google Sheets integration** for message data
- **Instant, scheduled, and combined message modes**
- **Persistent WhatsApp login** (no need to scan QR after first login)
- **Automatic background scheduling** (node-cron)
- **Multi-session support**

---

## Prerequisites
- Node.js 18+
- WhatsApp account (for authentication)
- Google Sheets API credentials (for reading sheets)

---

## Setup
1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Create a `.env` file** in the project root:
   ```env
   API_TOKEN=your_secret_token_here
   ```

3. **Ensure you have your Google Sheets credentials** (see `sheets.js` for details).

---

## Running the Server
```bash
node server.js
```
You should see:
```
🚀 REST API server running on port 3000
```

---

## API Usage
All endpoints require the header:
```
Authorization: Bearer <YOUR_API_TOKEN>
```

### 1. Create a New WhatsApp Session
```http
GET /session/new
```
- Returns: `{ success: true, sessionId: "..." }`
- Scan the QR code (see below) to authenticate.

### 2. Get QR Code for Session
```http
GET /session/:sessionId/qr
```
- Returns: `{ status: "QR_READY", qr: "data:image/png;base64,..." }` or `{ status: "READY" }`
- Use the base64 string to generate and scan the QR code with your WhatsApp app.

### 3. Send or Schedule Messages
```http
POST /send-now
Content-Type: application/json
{
  "sessionId": "...",
  "sheetName": "YourSheetName",
  "mode": "instant" | "scheduled" | "combined"
}
```
- `mode`:
  - `instant`: Send all messages immediately
  - `scheduled`: Only send messages whose scheduled time has arrived
  - `combined`: Both instant and scheduled
- Returns a summary of sent/skipped/scheduled messages.

---

## Scheduling & Automation
- When you trigger `/send-now` in `scheduled` or `combined` mode, the server will automatically start a background cron job to check for due messages every minute.
- The cron job stops automatically when all scheduled messages are sent.
- If you trigger scheduled mode again, the cron job restarts.

---

## WhatsApp Login Persistence
- The first time you create a session, scan the QR code to authenticate.
- The session is saved in `.wwebjs_auth` and `sessions.json`.
- **Do not delete `.wwebjs_auth` or `sessions.json`** if you want persistent login.
- On server restart, sessions are restored automatically—no need to scan the QR code again.

---

## Troubleshooting
- **WhatsApp client is not ready for this session:**
  - Wait for the log: `✅ WhatsApp client is ready for [sessionId]!` before calling `/send-now`.
  - If you deleted `.wwebjs_auth`, you must create a new session and scan the QR code again.
- **QR code keeps regenerating:**
  - Scan the latest QR code quickly; WhatsApp expires codes every ~20 seconds.
- **Scheduled messages not sent:**
  - Ensure the scheduled time is in a supported format (see logs for examples).
  - The cron job only runs when scheduled mode is triggered.

---

## Example Workflow
1. Start the server: `node server.js`
2. Create a session: `GET /session/new`
3. Get and scan QR code: `GET /session/:sessionId/qr`
4. Register a sheet for scheduling: `POST /send-now` with `mode: "scheduled"`
5. Wait for scheduled time; messages are sent automatically.
6. Stop/restart server as needed—login is persistent.

---

## Customizing Cron Interval
- By default, the cron job checks every minute (`'*/1 * * * *'`).
- To change, edit the cron expression in `startScheduledCron()` in `server.js`.

---

## Notes
- Keep `.wwebjs_auth` and `sessions.json` safe for persistent login.
- You can manage multiple WhatsApp sessions (multi-user support).
- All scheduling is handled automatically after the initial trigger.

---

## License
MIT

# WhatsApp Scheduler Bot (REST API Version)

## 🚀 Setup & Installation

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in:
     - `API_TOKEN=your_secret_token`
     - `GOOGLE_SHEET_ID=your_google_sheet_id`
     - (Other values as needed, e.g., timezone, due window, etc.)

4. **Add your Google API credentials:**
   - Place your `creds.json` in the project root (do not commit real credentials to public repos).

## 🟢 Start the REST API Server

```bash
node server.js
```
- The first time, scan the WhatsApp QR code in the terminal to authenticate.

## 🔁 Trigger Message Sending(IN NEW TERMINAL)

### 1. **Scheduled Messages (every X minutes)**
- Set `SCHEDULE_INTERVAL_MINUTES` in `.env` (default: 5)
- Run:
  ```bash
  node trigger-scheduler.js
  ```
  
Make sure u run the following in a new terminal while the server runs in other:
### 2. **Instant Messages (all at once)**
- Run:
  ```bash
  node trigger-instant.js
  ```

### 3. **Manual Trigger (for testing)**
- Use curl or PowerShell:
  ```powershell
  $headers = @{
    "Authorization" = "Bearer your_secret_token"
    "Content-Type" = "application/json"
  }
  $body = '{"mode":"combined"}'
  Invoke-RestMethod -Uri "http://localhost:3000/send-now" -Method Post -Headers $headers -Body $body
  ```

## 🛑 Stopping the Server/Scripts

- Press `Ctrl+C` in the terminal to stop any running server or script.

## 📁 Files to Include in the Repo

- `server.js` (REST API server)
- `sendMessage.js` (message logic)
- `utils.js` (utility functions)
- `config.js`, `config.json` (configuration)
- `sheets.js` (Google Sheets logic)
- `scheduler.js` (scheduling logic)
- `schedule-persistence.js` (schedule saving/loading)
- `menu.js` (menu system, if keeping CLI)
- `index.js` (main entry for CLI/menu, optional)
- `trigger-scheduler.js` (scheduled trigger script)
- `trigger-instant.js` (instant trigger script)
- `.env.example` (template for environment variables)
- `README.md` (this file)
- `.gitignore` (see below)

## 🔒 Security & .gitignore

- **Never commit your real `.env` or `creds.json` to a public repo.**
- Add these to `.gitignore`:
  ```
  .env
  creds.json
  .wwebjs_auth/
  .wwebjs_cache/
  node_modules/
  saved-schedules.json
  ```

## 📝 What to Share for Testing

- The repo (with all code/scripts above)
- `.env.example` file
- Updated `README.md`
- Google Sheet link (with sample/test data)
- API token (or instructions to set their own)

## 🛠️ Additional Notes
- The CLI/menu system (`start.js`, `index.js`, `menu.js`) is optional for REST API use, but can be included for advanced/manual control.
- All message scheduling and sending is now triggered via the REST API or the provided trigger scripts.
- For any issues, check the logs in your terminal for errors or status updates.

# WhatsApp Scheduler Bot

A WhatsApp automation tool with advanced cron-based scheduling capabilities for bulk messaging and message queue processing. Supports multi-timezone scheduling, auto-stop/restart functionality, and Google Sheets integration.

## 🚀 Features

- **WhatsApp Integration**: Connect to WhatsApp Web for automated messaging
- **Bulk Messaging**: Send messages to multiple recipients from Google Sheets
- **Scheduled Messaging**: Process messages at specific times with timezone support
- **Multi-timezone Support**: Configure any timezone via environment variables
- **Auto-stop & Restart**: Schedules pause when complete, restart when new messages added
- **Google Sheets Integration**: Read data from Google Sheets for messaging
- **Image Support**: Send messages with images (including Google Drive links)
- **Error Handling**: Robust error handling and retry mechanisms
- **Status Tracking**: Track message delivery status in Google Sheets

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v16 or higher) installed on your system
- **Google Sheets API** credentials set up
- **WhatsApp Web** access on your phone
- **Git** for cloning the repository

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd whatsapp-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
```bash
# Copy the environment template
cp env_template.txt .env

# Edit the .env file with your configuration
```

**Required Environment Variables:**
```bash
# Timezone Configuration
DEFAULT_TIMEZONE=Asia/Kolkata

# Scheduling Configuration  
DUE_WINDOW_MINUTES=60

# Google Sheets Configuration
GOOGLE_SHEET_ID=your_sheet_id_here
```

### 4. Set Up Google Sheets API

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API

#### Step 2: Create Service Account
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in service account details
4. Download the JSON credentials file

#### Step 3: Set Up Google Sheet
1. Create a new Google Sheet
2. Share it with your service account email (from the JSON file)
3. Copy the Sheet ID from the URL
4. Update `GOOGLE_SHEET_ID` in your `.env` file

#### Step 4: Add Credentials
1. Rename your downloaded JSON file to `creds.json`
2. Place it in the project root directory

### 5. Configure Your Sheet

Create a sheet with these columns:
- **Phone Numbers** (required): Recipient phone numbers
- **Message Text** (required): Message content  
- **Time** (optional): Scheduled time (HH:mm, dd/MM/yyyy HH:mm, etc.)
- **Image** (optional): Image URL or Google Drive link
- **Run** (optional): Set to "yes" to process
- **Status** (auto-updated): Delivery status
- **Campaign** (optional): Campaign name for tracking

## 🚀 Usage

### Starting the Bot
```bash
npm start
```

### First Time Setup
1. Run the bot: `npm start`
2. Scan the QR code with WhatsApp Web
3. Wait for connection confirmation
4. Use the menu to configure your team member

### Main Menu Options
1. **Send Messages Now** - Process instant messages (ignores time column)
2. **Send Scheduled Messages** - Process due scheduled messages
3. **Schedule Future Messages** - Set up recurring processing
4. **View Status & Schedules** - Monitor progress and active jobs
5. **Settings** - Manage schedules, team member, etc.
6. **Exit** - Close the application

## 📅 Scheduling Features

### Supported Time Formats
- **Time only**: `20:30`, `8:30 PM`
- **Date + Time**: `25/12/2024 20:30`, `2024-12-25 8:30 PM`
- **US Format**: `12/25/2024 8:30 PM`
- **ISO Format**: `2024-12-25 20:30`
- **Immediate**: `now`

### Cron Scheduling Examples
```bash
# Every 10 minutes
*/10 * * * *

# Every hour  
0 * * * *

# Daily at 9 AM
0 9 * * *

# Weekdays at 6 PM
0 18 * * 1-5

# Every Monday at 6 PM
0 18 * * 1
```

### Auto-Stop & Restart
- **Auto-stop**: Schedules pause when all scheduled messages are sent
- **Restart**: Add new messages to sheet, then use "Restart Stopped Schedule"
- **Preserved**: Schedule settings are kept for future use

## 🌍 Timezone Configuration

Set your timezone in the `.env` file:
```bash
DEFAULT_TIMEZONE=Asia/Kolkata
```

**Popular Timezones:**
- `Asia/Kolkata` - India (IST)
- `America/New_York` - Eastern Time (ET)
- `Europe/London` - British Time (GMT/BST)
- `Asia/Tokyo` - Japan (JST)
- `Australia/Sydney` - Australia (AEST/AEDT)

## 📊 Google Sheets Structure

### Example Sheet Layout
| Phone Numbers | Message Text | Time | Image | Run | Status | Campaign |
|---------------|--------------|------|-------|-----|--------|----------|
| 919078840822 | Hello! | 20:30 | https://... | yes | Sent | Campaign 1 |
| 919078840823 | Hi there! | | | yes | Pending | Campaign 1 |

### Phone Number Formats
- **Single**: `919078840822`
- **Multiple**: `919078840822, 919078840823`
- **With country code**: `+919078840822`
- **International**: `+1234567890`

## 🔧 Configuration Files

### .env
```bash
# Timezone Configuration
DEFAULT_TIMEZONE=Asia/Kolkata
DUE_WINDOW_MINUTES=60

# Google Sheets Configuration
GOOGLE_SHEET_ID=your_sheet_id_here
```

### config.json
```json
{
  "teamMember": "your_name",
  "bulkSheet": "BulkMessages_your_name",
  "queueSheet": "MessageQueue_your_name"
}
```

## 🚨 Troubleshooting

### Common Issues

**1. QR Code Not Scanning**
- Ensure WhatsApp Web is not active on other devices
- Try refreshing the QR code
- Check internet connection

**2. Google Sheets Access Error**
- Verify service account has edit permissions
- Check if `creds.json` is in the correct location
- Ensure Google Sheets API is enabled

**3. Messages Not Sending**
- Check phone number format
- Verify WhatsApp connection status
- Check for rate limiting (wait 1-2 minutes between messages)

**4. Timezone Issues**
- Verify `DEFAULT_TIMEZONE` in `.env`
- Check time format in your sheet
- Use 24-hour format for consistency

### Debug Mode
For detailed logging, check the console output for:
- Connection status
- Message processing details
- Error messages with row numbers

