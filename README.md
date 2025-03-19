# Story Server

A Node.js server for the What's Your Story project.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory (already done with basic configuration)

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

- `GET /`: Welcome message and API status check

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production) 