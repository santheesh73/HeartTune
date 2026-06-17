# 🎵 HeartTune

HeartTune is a modern music streaming web application built using **Next.js, TypeScript, Supabase, and the JioSaavn API**. It provides a beautiful music experience where users can discover songs, stream music, create playlists, like tracks, manage downloads, and view recently played songs.

---

## ✨ Features

### 🎶 Music Streaming
- Search songs, albums, artists, and playlists
- Stream music instantly
- High-quality audio playback
- Responsive music player

### ❤️ Personal Library
- Like and unlike songs
- Recently played history
- Downloaded songs management
- User-created playlists

### 🔐 Authentication
- Secure signup and login
- Supabase Authentication
- Persistent user sessions
- Profile management

### 📱 Progressive Web App (PWA)
- Installable on desktop and mobile
- Standalone app experience
- Offline-ready support
- Fast performance

### 🎨 Modern UI
- Dark theme design
- Responsive layout
- Smooth user experience
- Spotify-inspired interface

---

## 🛠 Tech Stack

- Next.js 16
- TypeScript
- Supabase
- PostgreSQL
- JioSaavn API
- Tailwind CSS
- Vercel

---

## 📂 Project Structure

```bash
HeartTune/
│
├── public/
├── src/
│   ├── api/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   ├── types/
│   └── utils/
│
├── .env.local
├── package.json
├── next.config.js
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env.local` file and add:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY

NEXT_PUBLIC_SAAVN_API_URL=https://saavn.sumit.co
```

---

## 🗄️ Supabase Setup

### Profiles Table

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz default now()
);
```

### Liked Songs Table

```sql
create table liked_songs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  song_id text not null,
  song_title text,
  artist_name text,
  album_name text,
  image_url text,
  audio_url text,
  duration integer,
  source text,
  created_at timestamptz default now()
);
```

### Recently Played Table

```sql
create table recently_played (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  song_id text not null,
  song_title text,
  artist_name text,
  album_name text,
  image_url text,
  audio_url text,
  duration integer,
  source text,
  played_at timestamptz default now()
);
```

### Downloads Table

```sql
create table downloads (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  song_id text not null,
  song_title text,
  artist_name text,
  album_name text,
  image_url text,
  audio_url text,
  duration integer,
  source text,
  downloaded_at timestamptz default now()
);
```

---

## 🚀 Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/hearttune.git
cd hearttune
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Open:

```bash
http://localhost:5175
```

---

## 🏗 Build for Production

```bash
npm run build
```

Start production server:

```bash
npm start
```

---

## ☁️ Deploy on Vercel

1. Push project to GitHub

```bash
git add .
git commit -m "Initial Commit"
git push origin main
```

2. Import repository into Vercel

3. Add Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SAAVN_API_URL
```

4. Click Deploy

---

## 📱 Install as App

### Desktop

- Open HeartTune in Chrome
- Click Install HeartTune
- Launch from Start Menu

### Android

- Open HeartTune in Chrome
- Tap Add to Home Screen
- Install

---

## 🔮 Future Enhancements

- AI Music Recommendations
- Lyrics Support
- Podcast Streaming
- Collaborative Playlists
- Social Sharing
- Offline Downloads

---

## 👨‍💻 Developer

**Tharun S**

B.Tech Artificial Intelligence & Data Science  
Sri Shakthi Institute of Engineering and Technology

---

## 📄 License

This project is licensed under the MIT License.

---

⭐ Star this repository if you found it useful!
