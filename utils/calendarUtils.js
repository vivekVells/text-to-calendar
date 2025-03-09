const { google } = require('googleapis');

/**
 * Creates a calendar event using the Google Calendar API
 * 
 * @param {Object} options - Options for creating the calendar event
 * @param {Object} options.auth - OAuth2 client for authentication
 * @param {string} options.calendarId - ID of the calendar to add the event to (default: 'primary')
 * @param {string} options.summary - Event title
 * @param {string} options.description - Event description
 * @param {string} options.startDateTime - ISO 8601 formatted start time
 * @param {string} options.endDateTime - ISO 8601 formatted end time
 * @returns {Promise<Object>} - Created event data
 */
const createCalendarEvent = async ({ 
  auth, 
  calendarId = 'primary', 
  summary, 
  description, 
  startDateTime, 
  endDateTime 
}) => {
  const calendar = google.calendar({ version: 'v3', auth });
  
  const { data } = await calendar.events.insert({
    calendarId,
    resource: {
      summary,
      description: description || summary,
      start: { dateTime: startDateTime },
      end: { dateTime: endDateTime }
    }
  });
  
  return {
    success: true,
    eventId: data.id,
    eventLink: data.htmlLink
  };
};

module.exports = {
  createCalendarEvent
};
