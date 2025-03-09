require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const { textToCalendarEvent } = require('./nlpService');
const { createCalendarEvent } = require('./utils/calendarUtils');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Configure OAuth
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
);

// Load saved tokens if available
try {
  const tokens = JSON.parse(fs.readFileSync('tokens.json'));
  oauth2Client.setCredentials(tokens);
} catch (error) { 
  console.warn("No auth tokens found - authentication will be required");
}

// Auth routes
app.get('/auth/google', (_, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar']
  });
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { tokens } = await oauth2Client.getToken(req.query.code);
  oauth2Client.setCredentials(tokens);
  fs.writeFileSync('tokens.json', JSON.stringify(tokens));
  res.redirect('/');
});

// API endpoint to create calendar event from structured JSON
app.post('/api/create-event', async (req, res) => {
  try {
    // Check if we have the required fields
    const { summary, description, startDateTime, endDateTime } = req.body;
    
    if (!summary || !startDateTime || !endDateTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: summary, startDateTime, endDateTime' 
      });
    }
    
    // Create the calendar event
    const result = await createCalendarEvent({
      auth: oauth2Client,
      summary,
      description,
      startDateTime,
      endDateTime
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(error.code || 500).json({ 
      error: error.message || 'Failed to create event' 
    });
  }
});

// API endpoint to create calendar event from natural language text
app.post('/api/text-to-event', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Missing required field: text'
      });
    }

    // Get user timezone from request headers or default to system timezone
    const timezone = req.get('X-Timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert the text to a structured event with timezone awareness
    const eventData = await textToCalendarEvent(text, timezone);
    const { summary, description = summary, startDateTime, endDateTime } = eventData;
    
    // Create the calendar event using the extracted data
    const result = await createCalendarEvent({
      auth: oauth2Client,
      summary,
      description,
      startDateTime,
      endDateTime
    });
    
    // Add the parsed data for reference
    res.status(201).json({
      ...result,
      eventData
    });
  } catch (error) {
    console.error('Error creating event from text:', error);
    res.status(error.code || 500).json({
      error: error.message || 'Failed to create event from text'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
