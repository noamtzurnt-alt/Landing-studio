Prompt-to-Production Landing Page Generator.

## What’s inside

- Streaming chat → code generation (Vercel AI SDK + Claude/Anthropic)
- Live preview (safe iframe sandbox rendering React + Tailwind)
- Iterative editing (chat includes current code context)
- Firebase Auth (anonymous) + Firestore session/message persistence
- Publish to Vercel via API (static deployment + optional alias)

## Getting started

First, run the development server:

```bash
npm run dev
```

Open `http://localhost:3000` and go to `/studio`.

## Environment variables

Copy `.env.example` → `.env.local` and fill what you need:

- **Chat (required for generation)**: `ANTHROPIC_API_KEY`
- **Firebase (optional)**: `NEXT_PUBLIC_FIREBASE_*`
- **Publish (optional)**: `VERCEL_TOKEN` (+ optionally `VERCEL_TEAM_ID`, `VERCEL_PROJECT_NAME`, `VERCEL_ROOT_DOMAIN`)

## Notes

- The **live preview** runs “fast preview TSX” (a `Landing()` component without imports) in an iframe via Tailwind CDN + Babel.
- The **production TSX** is what the model generates for publishing and may use `framer-motion`.

## Useful routes

- `/` marketing page
- `/studio` generator studio (chat + preview + publish)

