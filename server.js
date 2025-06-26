const express = require('express');
const dotenv = require('dotenv');
const { processCombinedMessages } = require('./sendMessage');
const ConfigManager = require('./config');
const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const cron = require('node-cron');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN;

const SESSIONS_FILE = 'sessions.json';

app.use(express.json());

// Session management
const sessions = {};

let scheduledCron = null;

function createSession(sessionId) {
  console.log(`Creating session: ${sessionId}`);
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: sessionId,
      dataPath: path.join(process.cwd(), '.wwebjs_auth')
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  sessions[sessionId] = {
    client,
    qr: null,
    status: 'INITIALIZING',
  };

  client.on('qr', async (qr) => {
    console.log(`QR received for ${sessionId}`);
    sessions[sessionId].qr = qr;
    sessions[sessionId].status = 'QR_READY';

    // Generate QR as base64 and save to file
    try {
      const qrCodeDataUrl = await qrcode.toDataURL(qr);
      fs.writeFile('qr_base64.txt', qrCodeDataUrl, (err) => {
        if (err) {
          console.error('❌ Failed to save QR code to file:', err);
        } else {
          console.log('✅ QR code saved to qr_base64.txt');
        }
      });
    } catch (err) {
      console.error('❌ Failed to generate QR code data URL for saving:', err);
    }
  });

  client.on('ready', () => {
    console.log(`WhatsApp client is ready for ${sessionId}!`);
    sessions[sessionId].status = 'READY';
  });

  client.on('auth_failure', (msg) => {
    console.error(`Authentication failure for ${sessionId}:`, msg);
    sessions[sessionId].status = 'AUTH_FAILURE';
    // Potentially remove session here or handle cleanup
  });

  client.on('disconnected', (reason) => {
    console.log(`Client for ${sessionId} was logged out:`, reason);
    delete sessions[sessionId];
  });

  client.initialize();
  return sessions[sessionId];
}

function getSession(sessionId) {
  return sessions[sessionId];
}

// Bearer token auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'];
  if (!API_TOKEN) return res.status(500).json({ error: 'API_TOKEN not set in .env' });
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.split(' ')[1];
  if (token !== API_TOKEN) {
    return res.status(403).json({ error: 'Invalid API token' });
  }
  next();
}

// Helper to load session IDs from file
function loadSessionIds() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading sessions file:', err);
  }
  return [];
}

// Helper to save session IDs to file
function saveSessionIds(sessionIds) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionIds, null, 2));
  } catch (err) {
    console.error('Error saving sessions file:', err);
  }
}

app.get('/session/new', requireAuth, (req, res) => {
  const sessionId = uuidv4();
  createSession(sessionId);

  // Save sessionId to file
  const sessionIds = loadSessionIds();
  if (!sessionIds.includes(sessionId)) {
    sessionIds.push(sessionId);
    saveSessionIds(sessionIds);
  }

  res.json({ success: true, sessionId });
});

app.get('/session/:sessionId/qr', requireAuth, async (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  if (session.status === 'READY') {
    return res.json({ success: true, status: 'READY', message: 'Client is already authenticated.' });
  }

  if (session.status !== 'QR_READY' || !session.qr) {
    return res.status(400).json({ error: 'QR code not ready yet. Please try again in a few seconds.' });
  }

  try {
    const qrCodeDataUrl = await qrcode.toDataURL(session.qr);
    res.json({ success: true, status: 'QR_READY', qr: qrCodeDataUrl });
  } catch (err) {
    console.error('Error generating QR code:', err);
    res.status(500).json({ error: 'Failed to generate QR code.' });
  }
});

function startScheduledCron() {
  if (!scheduledCron) {
    scheduledCron = cron.schedule('*/1 * * * *', async () => {
      let didWork = false;
      for (const sessionId in sessions) {
        const session = sessions[sessionId];
        if (session && session.status === 'READY' && session.sheetToSchedule && session.spreadsheetIdToSchedule) {
          if (!didWork) {
            console.log('⏰ Running scheduled message check...');
            didWork = true;
          }
          console.log(`   - Checking session ${sessionId} for sheet ${session.sheetToSchedule}`);
          try {
            const result = await processCombinedMessages(
              session.client,
              session.sheetToSchedule,
              { instantMode: false, scheduledMode: true, combinedMode: false },
              session.spreadsheetIdToSchedule
            );
            if (
              result &&
              typeof result.scheduledMessagesRemaining === 'number' &&
              result.scheduledMessagesRemaining === 0
            ) {
              console.log(`✅ All scheduled messages sent for session ${sessionId} on sheet ${session.sheetToSchedule}. Stopping further checks for this session.`);
              delete session.sheetToSchedule;
              delete session.spreadsheetIdToSchedule;
              // If no more sessions need scheduling, stop the cron
              if (!Object.values(sessions).some(s => s.sheetToSchedule)) {
                stopScheduledCron();
              }
            }
          } catch (err) {
            console.error(`❌ Error processing scheduled messages for session ${sessionId}:`, err.message);
          }
        }
      }
    });
    console.log('🟢 Scheduled message cron started');
  }
}

function stopScheduledCron() {
  if (scheduledCron) {
    scheduledCron.stop();
    scheduledCron = null;
    console.log('🔴 Scheduled message cron stopped');
  }
}

app.post('/send-now', requireAuth, async (req, res) => {
  const { sessionId, mode: rawMode, sheetName, spreadsheetId } = req.body;
  if (!sessionId || !sheetName || !spreadsheetId) {
    return res.status(400).json({ error: 'sessionId, sheetName, and spreadsheetId are required.' });
  }

  const session = getSession(sessionId);
  if (!session || session.status !== 'READY') {
    return res.status(403).json({ error: 'WhatsApp client is not ready for this session.' });
  }

  const mode = (rawMode || 'combined').toLowerCase();
  let options;
  if (mode === 'instant') {
    options = { instantMode: true, scheduledMode: false, combinedMode: false };
  } else if (mode === 'scheduled') {
    options = { instantMode: false, scheduledMode: true, combinedMode: false };
  } else {
    options = { instantMode: false, scheduledMode: false, combinedMode: true };
  }

  // If scheduled, register the sheet for auto-processing
  if (mode === 'scheduled' || mode === 'combined') {
    session.sheetToSchedule = sheetName;
    session.spreadsheetIdToSchedule = spreadsheetId;
    console.log(`✅ Scheduling enabled for session ${sessionId} on sheet ${sheetName}`);
    startScheduledCron(); // Start cron if not already running
  }

  try {
    const result = await processCombinedMessages(session.client, sheetName, options, spreadsheetId);
    let responseMessage = { success: true, mode, result };
    if (session.sheetToSchedule) {
      responseMessage.message = `Scheduled processing has been enabled for sheet: ${sheetName}. The server will now check for due messages automatically.`;
    }
    res.json(responseMessage);
  } catch (err) {
    console.error('❌ Error in /send-now:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.send('WhatsApp Scheduler Bot API is running. See API documentation for usage.');
});

app.listen(PORT, () => {
  console.log(`🚀 REST API server running on port ${PORT}`);
});

// Restore sessions on startup
const sessionIds = loadSessionIds();
sessionIds.forEach(sessionId => {
  console.log(`Restoring WhatsApp session: ${sessionId}`);
  createSession(sessionId);
});

// Remove the old always-running cron.schedule block at the end of the file. 
