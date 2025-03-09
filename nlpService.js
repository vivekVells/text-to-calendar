const axios = require('axios');

/**
 * Converts natural language text to a structured calendar event JSON
 * @param {string} text - Natural language request for creating a calendar event
 * @param {string} timezone - User's timezone (defaults to system timezone)
 * @returns {Promise<Object>} - Structured calendar event data
 */
const textToCalendarEvent = async (text, timezone) => {
  try {
    const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate';
    const ollamaModel = process.env.OLLAMA_MODEL || '3.2:latest';
    
    const { data } = await axios.post(ollamaEndpoint, {
      model: ollamaModel,
      prompt: buildPrompt(text, timezone),
      stream: false
    });
    
    return parseResponse(data.response);
  } catch (error) {
    console.error('Error calling Ollama:', error.message);
    throw new Error('Failed to convert text to calendar event');
  }
};

const buildPrompt = (text, timezone) => {
  // Get current date in user's timezone or system timezone
  const today = new Date();
  const tzOffset = today.getTimezoneOffset() * 60000; // offset in milliseconds
  const localToday = new Date(today.getTime() - tzOffset);
  const formattedDate = localToday.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Calculate tomorrow in user's timezone
  const tomorrow = new Date(localToday.getTime() + 24*60*60*1000);
  const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
  
  // Get timezone abbreviation/offset for examples
  const tzString = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzAbbr = new Date().toLocaleString('en-US', { timeZone: tzString, timeZoneName: 'short' }).split(' ').pop();
  
  return `
You are an expert calendar event extraction system designed to accurately convert natural language text into structured JSON. Your primary focus is to identify and precisely extract key event components: event type, participants, dates, times, durations, and locations. You excel at understanding context and preserving all relevant details from the original text. You maintain strict output formatting as valid JSON without any explanatory text.

TODAY'S DATE IS: ${formattedDate}
USER'S TIMEZONE IS: ${tzString} (${tzAbbr})

Given a text description of an event, extract the event information and return ONLY a valid JSON object with these fields:
- summary: The event title INCLUDING any participant names mentioned
- description: A detailed description of the event including participants, purpose, and any other details from the original text
- startDateTime: ISO 8601 formatted start time
- endDateTime: ISO 8601 formatted end time

Rules:
- TODAY'S DATE IS ${formattedDate} - all relative dates must be calculated from this date
- Use the user's timezone (${tzString}) for all datetime calculations
- "Tomorrow" means ${tomorrowFormatted}
- "Next week" means ${formattedDate} + 7 days
- For dates without specified times, assume the following defaults:
  - All-day events should start at 00:00:00 and end at 23:59:59
  - Events without specified times should start at 9:00 AM
  - If duration is not specified, assume 1 hour for meetings/calls and 2 hours for other events
- For dates without a year, assume the current or next occurrence
- For relative dates like "tomorrow" or "next Friday", calculate the actual calendar date
- Include timezone information in the ISO timestamp (use offset format like "-05:00" for CST)
- Always extract participant names and include them in both the summary and description
- If someone is mentioned (like "with Sara"), include their name in the event summary

YOUR RESPONSE MUST BE A VALID JSON OBJECT ONLY. NO OTHER TEXT, EXPLANATION, OR FORMATTING. NO MARKDOWN CODE BLOCKS. JUST THE RAW JSON OBJECT.

Examples:

Input: "Schedule a team meeting tomorrow at 2pm for 45 minutes"
Output: {"summary":"Team Meeting","description":"Team Meeting","startDateTime":"${tomorrowFormatted}T14:00:00${getTimezoneOffset(tzString)}","endDateTime":"${tomorrowFormatted}T14:45:00${getTimezoneOffset(tzString)}"}

Input: "Schedule a team meeting with Sara tomorrow at 3pm for 2 hours"
Output: {"summary":"Team Meeting with Sara","description":"Team Meeting with Sara","startDateTime":"${tomorrowFormatted}T15:00:00${getTimezoneOffset(tzString)}","endDateTime":"${tomorrowFormatted}T17:00:00${getTimezoneOffset(tzString)}"}

Input: "Create a dentist appointment on April 15 from 10am to 11:30am"
Output: {"summary":"Dentist Appointment","description":"Dentist Appointment","startDateTime":"2025-04-15T10:00:00${getTimezoneOffset(tzString)}","endDateTime":"2025-04-15T11:30:00${getTimezoneOffset(tzString)}"}

Input: "Set up a project kickoff with the marketing team next Monday at 10am"
Output: {"summary":"Project Kickoff with Marketing Team","description":"Project Kickoff with the Marketing Team","startDateTime":"2025-03-17T10:00:00${getTimezoneOffset(tzString)}","endDateTime":"2025-03-17T11:00:00${getTimezoneOffset(tzString)}"}

Now convert the following text to a calendar event JSON:
"${text}"

REMEMBER: RESPOND WITH RAW JSON ONLY. NO ADDITIONAL TEXT OR FORMATTING.
`;
};

/**
 * Gets the timezone offset in ISO format (e.g., "-05:00" for CST)
 * @param {string} timezone - Timezone identifier (e.g., "America/Chicago")
 * @returns {string} - Timezone offset in ISO format
 */
const getTimezoneOffset = (timezone) => {
  try {
    // Create a date in the specified timezone
    const date = new Date();
    // Format the date with the timezone offset
    const options = { timeZone: timezone, timeZoneName: 'longOffset' };
    const tzString = new Intl.DateTimeFormat('en-US', options).format(date);
    
    // Extract the GMT offset (e.g., "GMT-05:00")
    const offsetMatch = tzString.match(/GMT([+-]\d{2}:\d{2})/);
    if (offsetMatch && offsetMatch[1]) {
      return offsetMatch[1];
    }
    
    // Fallback to local system timezone offset
    const offset = date.getTimezoneOffset();
    const hours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, '0');
    const minutes = Math.abs(offset % 60).toString().padStart(2, '0');
    return (offset <= 0 ? '+' : '-') + hours + ':' + minutes;
  } catch (error) {
    // Default fallback
    return '-06:00';  // Default to CST if we can't determine timezone
  }
};

const parseResponse = (responseText) => {
  try {
    // Try to find and extract valid JSON from the response
    const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
    
    if (jsonMatch && jsonMatch[0]) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If no JSON pattern found, try parsing the whole response
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error parsing LLM response:', error.message);
    throw new Error('Failed to parse the generated calendar event data');
  }
};

module.exports = { textToCalendarEvent };
