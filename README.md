# Google Calendar API with Express.js

A lightweight Express.js API that exposes an endpoint for creating Google Calendar events.

## Features

- Google OAuth2 authentication
- Calendar event creation
- Simple form-based frontend interface

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up OAuth2 credentials:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API
   - Create OAuth2 credentials (Web application type)
   - Add http://localhost:3000/auth/google/callback as an authorized redirect URI

4. Create a `.env` file with your OAuth2 credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   PORT=3000
   ```

## Usage

1. Start the server:
   ```
   npm start
   ```

2. The API will be available at `http://localhost:3000`

3. First, authenticate by visiting:
   ```
   http://localhost:3000/auth/google
   ```

4. After authentication, you can create calendar events by sending a POST request to `/api/create-event` with JSON data.

## API Endpoint

### POST /api/create-event
Create a new calendar event

**Request**
```json
{
  "summary": "Team Meeting",
  "description": "Weekly team status update",
  "startDateTime": "2023-12-15T14:00:00-07:00",
  "endDateTime": "2023-12-15T15:00:00-07:00"
}
```

**Response**
```json
{
  "success": true,
  "eventId": "a1b2c3d4e5f6g7h8i9j0",
  "eventLink": "https://calendar.google.com/calendar/event?eid=..."
}
```

## Testing with cURL

Create an event:
```bash
curl -X POST http://localhost:3000/api/create-event \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Team Meeting",
    "description": "Weekly team status update",
    "startDateTime": "2023-12-15T14:00:00-07:00",
    "endDateTime": "2023-12-15T15:00:00-07:00"
  }'
```

## Web Interface

A simple web interface is available at http://localhost:3000, which provides:
- A button to authenticate with Google
- A form to create calendar events
- Clear feedback when events are created successfully

## Security Notes

- This demo uses a simple file-based token storage system
- For production, implement more secure token storage
- Use HTTPS for all API endpoints in production
