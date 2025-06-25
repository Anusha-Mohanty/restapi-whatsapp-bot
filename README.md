# WhatsApp Bot REST API

## Quick Start Workflow

1. **Clone the Repository**
   ```bash
   git clone <your-repository-url>
   cd whatsapp-bot-restapi
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   - Copy the example file and edit it:
     ```bash
     # On Windows (PowerShell)
     Copy-Item .env.example .env

     # On Linux/macOS
     cp .env.example .env
     ```
   - Edit `.env` and set your `API_TOKEN`.

4. **Start the Server**
   ```bash
   node server.js
   ```

5. **Create a New WhatsApp Session**
   ```powershell
   Invoke-RestMethod -Uri http://localhost:3000/session/new -Method Get -Headers @{"Authorization"="Bearer YOUR_API_TOKEN"}
   ```
   - Copy the `sessionId` from the response.

6. **Add the Session ID to `payload.json`**
   - Edit `payload.json`:
     ```json
     {
       "sessionId": "YOUR_SESSION_ID",
       "sheetName": "YourSheetName",
       "mode": "instant"
     }
     ```

7. **Generate QR Code**
   ```powershell
   Invoke-RestMethod -Uri http://localhost:3000/session/YOUR_SESSION_ID/qr -Method Get -Headers @{"Authorization"="Bearer YOUR_API_TOKEN"}
   ```
   - Convert the base64 string to an image and scan it with WhatsApp **within 20 seconds** (or repeat this step for a new QR code if it expires).

8. **Wait for WhatsApp Client to be Ready**
   - Watch the server logs for:  
     `✅ WhatsApp client is ready for [sessionId]!`

9. **Send Messages (Trigger)**
   - For instant mode:
     ```powershell
     # (Make sure "mode": "instant" in payload.json)
     Invoke-RestMethod -Uri http://localhost:3000/send-now -Method Post -Headers @{"Authorization"="Bearer YOUR_API_TOKEN"} -ContentType "application/json" -Body (Get-Content -Raw -Path payload.json)
     ```
   - For scheduled mode:
     - Change `"mode": "scheduled"` in `payload.json` and run the same command.

10. **Check Output**
    - Review the response and server logs for sent, failed, or scheduled messages.

---

## How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Copy the example environment file and fill in your values:**
   ```bash
   # On Windows (PowerShell)
   Copy-Item .env.example .env

   # On Linux/macOS
   cp .env.example .env
   
   # Then, edit .env to set your API_TOKEN
   ```
3. **Start the server:**
   ```bash
   node server.js
   ```
   You should see:
   ```
   🚀 REST API server running on port 3000
   ```
4. **API Usage:**
   - Use an API client (like Postman) or the PowerShell/curl examples below.

### Example Usage (PowerShell)

**1. Create a New Session:**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/session/new -Method Get -Headers @{"Authorization"="Bearer YOUR_API_TOKEN"}
```
*(This will return a `sessionId` needed for the next steps.)*

**2. Get QR Code:**
*(Replace `YOUR_SESSION_ID` with the ID from the previous step)*
```powershell
Invoke-RestMethod -Uri http://localhost:3000/session/YOUR_SESSION_ID/qr -Method Get -Headers @{"Authorization"="Bearer YOUR_API_TOKEN"}
```
*(This returns a base64 string. Use an online tool to convert it to a QR image and scan with WhatsApp.)*

**3. Send/Schedule Messages:**
*(First, create a `payload.json` file. You can copy `payload.example.json` to get started.)*
```powershell
Invoke-RestMethod -Uri http://localhost:3000/send-now -Method Post -Headers @{"Authorization"="Bearer YOUR_API_TOKEN"} -ContentType "application/json" -Body (Get-Content -Raw -Path payload.json)
```

---

## Why Use `payload.json` for API Testing?

On Windows/PowerShell, using a `payload.json` file for your API requests is recommended. It avoids tricky issues with quotes and escaping characters, making your commands cleaner and more reliable. For Linux/macOS, using inline JSON with `curl` is also common.

---

## API Documentation
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

## External API Reference

### Generate OTP
Add support to auto register if user does not exist using `isAutoRegisterer` field.

| URL                                   | Method |
|----------------------------------------|--------|
| `{{host}}/usr/v1/login-otp/generate`  | POST   |

<details>
<summary>Request</summary>

<!-- Example request body here -->

</details>

<details>
<summary>Response</summary>

<!-- Example response body here -->

</details>

---

### Login OTP
No changes required.

| URL                                 | Method |
|-------------------------------------|--------|
| `{{host}}/usr/v1/login-otp/verify` | POST   |

<details>
<summary>Request</summary>

<!-- Example request body here -->

</details>

<details>
<summary>Response</summary>

<!-- Example response body here -->

</details>

---

### Send Receipt
Send receipt to help@mez.ink & user email.

| URL                                 | Method | Authorization   |
|-------------------------------------|--------|-----------------|
| `{{host}}/usr/v1/invoice/campaign` | POST   | Bearer Token    |

<details>
<summary>Request</summary>

<!-- Example request body here -->

</details>

<details>
<summary>Response</summary>

<!-- Example response body here -->

</details>

---

## Notes
- Keep `.wwebjs_auth` and `sessions.json` safe for persistent login.
- You can manage multiple WhatsApp sessions (multi-user support).
- All scheduling is handled automatically after the initial trigger.

---



