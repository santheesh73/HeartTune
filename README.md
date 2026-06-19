# 🎵 HeartWave

### Your Music. Your Mood. Your World.

HeartWave is a modern AI-powered music streaming platform built with **Next.js, React, TypeScript, and Supabase**, designed to deliver a seamless, personalized, and immersive music experience. With powerful playlist management, intelligent recommendations, offline downloads, multilingual support, and a beautiful user interface, HeartWave transforms the way users discover and enjoy music.

---

## ✨ Features

### 🎧 Music Streaming

* High-quality music playback
* Fast song search and discovery
* Trending tracks and popular albums
* Artist and album exploration
* Smooth playback controls

### ❤️ Personal Library

* Like and save favorite songs
* Create and manage playlists
* Recently played history
* Personalized music collection
* Quick access to favorite content

### 📥 Offline Downloads

* Download songs for offline listening
* IndexedDB-powered local storage
* Fast access to downloaded tracks
* Offline playback support

### 🌍 Multilingual Experience

* Multiple language support
* Localized user interface
* Enhanced accessibility for global users

### 🔐 Secure Authentication

* Supabase Authentication
* Secure user sessions
* Protected user data
* Row Level Security (RLS)

### ⚡ Modern User Experience

* Responsive design
* Mobile-first approach
* Smooth animations
* Dark mode interface
* Fast loading performance

---

## 🏗️ Tech Stack

### Frontend

* Next.js 16
* React 19
* TypeScript
* React Router DOM
* Framer Motion
* Lucide React

### Backend & Database

* Supabase
* PostgreSQL
* Supabase Authentication
* Row Level Security (RLS)

### Deployment

* Vercel

### Storage

* IndexedDB
* Browser Local Storage

---

## 📸 Application Highlights

✅ Modern Music Streaming Experience

✅ Playlist Management System

✅ Personalized Music Library

✅ Offline Download Support

✅ Responsive Mobile Design

✅ Secure User Authentication

✅ Fast Search & Discovery

✅ Beautiful UI/UX

---

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/santheesh73/HeartTune.git
cd HeartTune
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

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

HeartTune password reset uses Supabase password recovery links. To make the reset email mention HeartTune instead of Supabase default wording, paste `supabase/email-templates/password-recovery.html` into Supabase Dashboard > `Authentication` > `Emails` > `Templates` > `Password Recovery`. Set the subject to `Reset your HeartTune password`. The template must include `{{ .ConfirmationURL }}`.

In Supabase Auth settings, add your deployed domain to the allowed redirect URLs, for example:

```text
https://your-domain.vercel.app
https://your-domain.vercel.app/**
https://your-domain.vercel.app/reset-password
http://localhost:3000
http://localhost:3000/**
http://localhost:3000/reset-password
```

Password reset links will not work reliably unless the exact `/reset-password` URL for local and production is allowed in Supabase.

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

---

## 📂 Project Structure

```text
HeartWave/
├── src/
│   ├── app/
│   ├── components/
│   ├── context/
│   ├── views/
│   ├── api/
│   ├── hooks/
│   ├── lib/
│   └── utils/
├── public/
├── supabase/
├── middleware.ts
├── next.config.mjs
└── package.json
```

---

## 🔒 Security

HeartWave leverages modern security practices:

* Supabase Authentication
* Row Level Security (RLS)
* Protected User Data
* Secure Environment Variables
* Session Management
* Database Access Controls

Future enhancements include:

* Advanced API Rate Limiting
* Security Headers
* Email Verification
* Multi-Factor Authentication (MFA)
* Monitoring & Audit Logging

---

## 🎯 Future Roadmap

* AI-Powered Music Recommendations
* Smart Mood-Based Playlists
* Social Music Sharing
* Real-Time Collaborative Playlists
* Artist Dashboard
* Premium Subscription Features
* Enhanced Offline Experience
* Advanced Analytics

---

## 📈 Project Status

🚧 Actively Under Development

HeartWave is continuously evolving with new features, security improvements, performance optimizations, and enhanced user experiences.

---

## 👨‍💻 Developer

### Santheesh

AI & Data Science Student
Full Stack Developer | AI Enthusiast | Problem Solver

Passionate about building intelligent, scalable, and user-centric applications that combine modern web technologies with exceptional user experiences.

---

## ⭐ Support

If you found this project useful:

⭐ Star the repository

🍴 Fork the project

🛠️ Contribute improvements

📢 Share feedback

---

## 📜 License

This project is licensed under the MIT License.

---

### "Music is not just sound — it's emotion, memory, and connection. HeartWave brings them together."
