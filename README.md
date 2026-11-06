# SparkPay Employee App

The app staff use to see their pay. It talks only to the SparkPay backend.

## Run locally

**Prerequisites:** Node.js 20 or later.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `VITE_API_URL` to the backend URL, for example `http://localhost:5000`
3. Start the app: `npm run dev`

## Commands

- `npm run dev`: start the dev server on port 3000
- `npm run build`: production build
- `npm test`: run the tests (Vitest)
