# WhatsApp Bot REST API

## How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Copy the example environment file and fill in your values:**
   ```bash
   cp .env.example .env
   # Edit .env to set your API_TOKEN and any other required values
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
   - Use an API client (like Postman) or PowerShell/curl to interact with the endpoints as described below.
   - For Windows/PowerShell, use a `payload.json` file for POST requests (see below for details).

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

or run like this:
Example (PowerShell):

Invoke-RestMethod -Uri http://localhost:3000/send-now -Method Post -Headers @{"Authorization"="Bearer YOUR_TOKEN"} -ContentType "application/json" -Body (Get-Content -Raw -Path payload.json)
Example (Linux/macOS):

curl -X POST -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"sessionId":"...","sheetName":"...","mode":"scheduled"}' http://localhost:3000/send-now

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


