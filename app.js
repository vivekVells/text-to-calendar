require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');

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
} catch (e) { 
  throw new Error("Required auth tokens aren't available");
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

// API endpoint to create calendar event
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
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary,
        description: description || summary,
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime }
      }
    });
    
    res.status(201).json({
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(error.code || 500).json({ 
      error: error.message || 'Failed to create event' 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
