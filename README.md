# HeartTune

HeartTune is a Spotify-inspired music streaming app built with Next.js, React, TypeScript, Supabase, and the JioSaavn API. It includes authentication, liked songs, playlists, recently played songs, downloads metadata, and installable PWA support.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Supabase Auth and Database
- JioSaavn API
- PWA service worker and offline fallback

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:5175`.

## Required Environment Variables

Add these values in `.env.local` for local development and in your hosting provider for production:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXT_PUBLIC_SAAVN_API_URL=https://saavn.sumit.co
NEXT_PUBLIC_API_BASE_URL=/api
```

`NEXT_PUBLIC_API_BASE_URL=/api` uses the Next.js rewrite in `next.config.mjs` to proxy API requests to `NEXT_PUBLIC_SAAVN_API_URL`.

## Supabase Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL editor before using production auth and library features.

In Supabase Auth settings, add your deployed domain to the allowed redirect URLs, for example:

```text
https://your-domain.vercel.app
https://your-domain.vercel.app/**
```

## Deploy To Vercel

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Set the environment variables listed above.
4. Use the default Next.js framework settings.
5. Deploy.

The included `vercel.json` pins the build to:

```bash
npm ci
npm run build
```

## Production Checks

```bash
npm run build
npm run start
```

The app registers the service worker only in production. After deploying, verify:

- The app loads at the deployed URL.
- Search and playback can reach `/api`.
- Sign up/sign in works with your Supabase project.
- The PWA install prompt appears in supported browsers.
- `/offline.html`, `/manifest.json`, and `/service-worker.js` return successfully.
