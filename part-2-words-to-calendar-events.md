# [Part-2] Text to Action: Words to Calendar Events - Building a Smart Calendar AI Assistant

Welcome back to the "Text to Action" series! In [Part 1](README.md), we built the foundation for our calendar integration - an Express.js backend that connects to Google Calendar's API to handle event creation.

In this episode, we're taking a giant leap forward by enabling natural language understanding. You'll be able to type something like "Schedule a team meeting tomorrow at 3pm for one hour" and have it instantly transform into a properly structured calendar event.

The complete code is available on [GitHub](https://github.com/vivekvells/text-to-calendar-ai).

**Tutorial video:** [YouTube Link]

## What We're Building

We'll create an API endpoint and user interface that can:

1. Accept natural language descriptions of events
2. Parse them into structured data using a local LLM (Ollama)
3. Create the actual events in Google Calendar

This bridges the gap between human language and machine-readable data structures - a fundamental challenge in building AI-powered applications.

## Prerequisites

- Completed [Part 1](README.md) setup
- [Ollama](https://ollama.com/) installed locally
- The llama3.2:latest model pulled in Ollama

```bash
# Install Ollama from https://ollama.com/
# Then pull the model:
ollama pull llama3.2:latest
```

## Project Structure

Building on our previous foundation, we'll add these new files:

```
text-to-calendar/
├── app.js                # Updated with new endpoint
├── nlpService.js         # New NLP service for text processing
├── utils/                # Utility functions
│   └── calendarUtils.js  # Calendar API helper functions
├── public/               # Static files
│   ├── index.html        # Updated with navigation
│   └── text-to-event.html # New UI for natural language input
├── test-text-to-event.sh # Testing script
└── .env                  # Updated environment variables
```

## Step 1: Understanding the Challenge

Converting natural language to structured data requires understanding:

1. **Intent extraction** - What is the user trying to do?
2. **Entity recognition** - What are the key details (event name, time, date, duration)?
3. **Standardization** - Converting varied expressions ("tomorrow", "next Tuesday") into ISO-formatted datetime

This is where large language models shine. With proper prompting, they can understand context and extract structured information from natural text.

## Step 2: Creating the NLP Service

First, let's install the axios package for making HTTP requests to our local Ollama instance:

```bash
npm install axios
```

Now, create a new file `nlpService.js` to handle the text-to-structure conversion:

```javascript
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
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:latest';
    
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
You are a system that converts natural language text into JSON for calendar events.

TODAY'S DATE IS: ${formattedDate}
USER'S TIMEZONE IS: ${tzString} (${tzAbbr})

Given a text description of an event, extract the event information and return ONLY a valid JSON object with these fields:
- summary: The event title
- description: A brief description of the event (use the title if no description is provided)
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

YOUR RESPONSE MUST BE A VALID JSON OBJECT ONLY. NO OTHER TEXT, EXPLANATION, OR FORMATTING.
NO MARKDOWN CODE BLOCKS. JUST THE RAW JSON OBJECT.

Examples:

Input: "Schedule a team meeting tomorrow at 2pm for 45 minutes"
Output:
{"summary":"Team Meeting","description":"Team Meeting","startDateTime":"${tomorrowFormatted}T14:00:00${getTimezoneOffset(tzString)}","endDateTime":"${tomorrowFormatted}T14:45:00${getTimezoneOffset(tzString)}"}

Input: "Create a dentist appointment on April 15 from 10am to 11:30am"
Output:
{"summary":"Dentist Appointment","description":"Dentist Appointment","startDateTime":"2025-04-15T10:00:00${getTimezoneOffset(tzString)}","endDateTime":"2025-04-15T11:30:00${getTimezoneOffset(tzString)}"}

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
```

### The Prompt Engineering Magic

Our improved prompt design includes several important enhancements:

1. **Timezone awareness** - We now explicitly handle the user's timezone
2. **Date anchoring** - We tell the model what "today" is to properly handle relative dates
3. **Specific defaults** - We're clear about what to assume for unspecified details
4. **Dynamic examples** - Our examples include the actual calculated dates for tomorrow

This makes the natural language processing much more reliable and eliminates many common date/time ambiguities.

## Step 3: Refactoring for Better Organization

To make our code more maintainable, we've created a `utils` folder with a `calendarUtils.js` file to handle Calendar API operations:

```javascript
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
```

## Step 4: Adding a New API Endpoint

Now let's update our `app.js` file to add a new endpoint that leverages our NLP service:

```javascript
// Add these imports at the top
const { textToCalendarEvent } = require('./nlpService');
const { createCalendarEvent } = require('./utils/calendarUtils');

// Add this new endpoint after the existing /api/create-event endpoint
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
```

This endpoint:
1. Accepts a natural language text description
2. Extracts the user's timezone from request headers
3. Sends the text and timezone to our NLP service for processing
4. Uses the structured output to create an actual calendar event
5. Returns both the event details and the structured data for reference

## Step 5: Creating a User Interface

We've created a dedicated UI for natural language input in `public/text-to-event.html`. The interface includes:

1. A simple form for entering natural language text
2. Example phrases users can click to try out
3. Clear feedback showing the parsed event details
4. A loading indicator while processing
5. Debug information to understand how the text was interpreted

We've also updated our original `index.html` to include navigation between the two interfaces, creating a more cohesive user experience.

## Step 6: Testing with curl

To make testing easier, we've created a shell script that sends requests to our API:

```bash
#!/bin/bash

# Test the text-to-event endpoint with a natural language input
# Usage: ./test-text-to-event.sh "Schedule a meeting tomorrow at 3pm for 1 hour"

TEXT_INPUT=${1:-"Schedule a team meeting tomorrow at 2pm for 45 minutes"}

# Try to detect system timezone
TIMEZONE=$(timedatectl show --property=Timezone 2>/dev/null | cut -d= -f2)
# Fallback to a popular timezone if detection fails
TIMEZONE=${TIMEZONE:-"America/Chicago"}

echo "Sending text input: \"$TEXT_INPUT\""
echo "Using timezone: $TIMEZONE"
echo ""

curl -X POST http://localhost:3000/api/text-to-event \
  -H "Content-Type: application/json" \
  -H "X-Timezone: $TIMEZONE" \
  -d "{\"text\": \"$TEXT_INPUT\"}" | json_pp

echo ""
```

Save this as `test-text-to-event.sh` and make it executable:

```bash
chmod +x test-text-to-event.sh
```

Now you can test your API with different natural language inputs:

```bash
./test-text-to-event.sh "Set up a project review on Friday at 11am"
```

## The Complete Pipeline

Let's review the full flow of what happens when a user enters natural language text:

1. User provides text like "Schedule a team meeting tomorrow at 2pm for 45 minutes"
2. The request is sent to our `/api/text-to-event` endpoint with the user's timezone
3. Our NLP service constructs a prompt with current date and timezone information
4. Ollama processes the text and extracts structured event data
5. The structured data is passed to the Google Calendar API through our utility function
6. A calendar event is created and the details are returned to the user

This pipeline demonstrates the core concept of our "Text to Action" series: transforming natural language into real-world actions through a structured API.

## The Magic of Prompt Engineering

The heart of our text processing capability is the prompt we send to the language model. Let's break down why our prompt is effective:

1. **Context awareness** - We provide today's date and the user's timezone
2. **Clear task definition** - We explicitly define what the model should do
3. **Structured output format** - We specify the exact JSON structure
4. **Handling edge cases** - We provide rules for ambiguous inputs
5. **Dynamic examples** - Our examples include real dates calculated for the user's context
6. **Single responsibility** - The prompt does one job and does it well

The result is a robust text-to-structure conversion that works reliably with a wide range of natural language inputs.

## Environment Variables Update

Don't forget to update your `.env` file with the Ollama settings:

```
# Ollama LLM settings
OLLAMA_ENDPOINT=http://localhost:11434/api/generate
OLLAMA_MODEL=llama3.2:latest
```

## Next Steps

In this tutorial, we've built a powerful natural language interface for calendar event creation. But we've only scratched the surface of what's possible.

In the upcoming episodes of this series, we'll:

1. Add voice command capabilities for hands-free event creation
2. Expand to multiple services beyond just calendars
3. Build agent-based decision making for more complex tasks

Stay tuned for [Part 3](Link-to-Part-3) where we'll add voice recognition to make our system truly accessible!

## Resources

- [Complete code on GitHub](https://github.com/vivekvells/text-to-calendar-ai)
- [Part 1: Calendar API Foundation](https://medium.com/@vivekvells/build-a-google-calendar-api-with-express-js-7f9955caeb88)
- [Ollama documentation](https://github.com/ollama/ollama)
- [Google Calendar API docs](https://developers.google.com/calendar/api)

Let us know in the comments what you'd like to see in future episodes of the "Text to Action" series!
