# Text to Calendar AI

Transform natural language into calendar events instantly with this AI-powered assistant that turns your words into scheduled actions.

## Project Overview

This project demonstrates how to build a complete system for converting natural language instructions into structured actions, using calendar events as our example. 

The series is broken down into modules:

1. **Calendar API Foundation** - Create a robust REST API for Google Calendar
2. **Words to Calendar Events** - Convert natural language to structured calendar events
3. **Voice Command Integration** - Add speech recognition (coming soon)

## Tutorial Resources

Check out the complete step-by-step guides for this project:

### Video Tutorials
- [Complete YouTube Playlist](https://www.youtube.com/watch?v=AB3i7E0hzEk&list=PL7qSPQlgOO9LA10Dn6sj3kEO9E6j8SpdS)
- [Part 1: Calendar API](https://youtu.be/AB3i7E0hzEk?si=bdqaYkyRx8W9i4DP)
- [Part 2: Words to Calendar Events](https://youtu.be/link_to_part_2)

### Written Guides
- **Part 1: Calendar API Foundation**
  - [Project Documentation](part-1-calendar-api.md)
  - [Medium Blog Post](https://medium.com/@vivekvells/build-a-google-calendar-api-with-express-js-7f9955caeb88)
- **Part 2: Words to Calendar Events**
  - [Project Documentation](part-2-words-to-calendar-events.md)
  - [Medium Blog Post](https://medium.com/@vivekvells/part-2-text-to-action-words-to-calendar-events-building-a-smart-calendar-ai-assistant-3ca928705442)

## Quick Start

1. Clone this repository
2. Install dependencies: `npm install`
3. Set up required environment variables in `.env`
4. Start the server: `npm start`
5. Visit http://localhost:3000

See the individual module documentation for detailed setup instructions:
- [Part 1 Setup](part-1-calendar-api.md#setup)
- [Part 2 Setup](part-2-words-to-calendar-events.md#prerequisites)

## Features

- **Google Calendar Integration** with OAuth2 authentication
- **Natural Language Processing** to convert plain text to calendar events
- **Timezone-aware** date/time handling
- **Web Interface** for both structured and natural language input
- **Command-line Testing** tools

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/create-event` | Create event from structured JSON data |
| `POST /api/text-to-event` | Create event from natural language text |

## Testing with cURL

> Use your timezone or run `test-text-to-event.sh`

```bash
# Create event with natural language
curl -X POST http://localhost:3000/api/text-to-event \
  -H "Content-Type: application/json" \
  -H "X-Timezone: America/New_York" \
  -d '{"text": "Schedule a team meeting tomorrow at 3pm for 1 hour"}'
```
