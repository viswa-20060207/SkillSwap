# SkillSwap 🎓⚡

**SkillSwap** is a modern, peer-to-peer 1-on-1 skill exchange and collaborative learning platform designed for university students and developers. Connect with peers to teach what you know (e.g. Java, Python, C++) and learn what you need (e.g. System Design, Communication, Public Speaking) through real-time chat, code snippet sharing, private file exchange, and live voice calls.

---

## 🌟 Key Features

- **🔐 Authentication & User Profiles (P3):**
  - Email/password authentication with password visibility toggle.
  - Optional Google OAuth sign-in.
  - Auto-created user profile on signup with name, bio, and college.
  - Public profile page (`/profile/[id]`) and editable private profile (`/profile/edit`).
  - Avatar uploads to private Supabase Storage `'avatars'` bucket.
- **🔎 Skills Taxonomy, Search & Following (P4):**
  - "I can teach" and "I want to learn" skill managers with proficiency levels (`Beginner`, `Intermediate`, `Advanced`).
  - Case-insensitive partial skill search with proficiency filters (`/explore`).
  - Optimistic follow/unfollow toggle and `/following` connections feed.
- **📅 Session Requests & Access Control (P5):**
  - 1-on-1 session request modal with topic selection and intro note.
  - Incoming & outgoing session dashboard (`/requests`) with Accept/Decline actions.
  - Secure `/sessions/[id]` room protected by Supabase Row Level Security (RLS) accessible only to accepted participants.
- **💬 Real-time Chat (P6):**
  - Supabase Realtime channel subscriptions for zero-refresh messaging.
  - Optimistic message bubbles, `Enter` to send, `Shift+Enter` for newlines, and auto-scroll.
- **💻 Notes & Code Snippets Sharing (P7):**
  - Multi-language code snippet editor with syntax highlighting and 1-click copy.
  - File sharing for PDFs, PNGs, and JPGs (up to 5 MB) stored under private `'notes'` bucket with expiring signed URLs.
- **📞 Live Voice Calling (P8):**
  - 1-on-1 audio calling powered by Daily.co prebuilt rooms.
  - Server-verified API route (`/api/call/[sessionId]`) that ensures callers are participants of an accepted session.
  - Embedded call panel with audio-only defaults and a 2-hour room expiration.
- **🛡️ Community Safety & Polish (P9):**
  - Report profiles with structured reasons (`Harassment`, `Spam`, `Inappropriate`, `Other`) saved to `reports`.
  - Block profiles saved to `blocks`; blocks bidirectionally hide users from `/explore` and disable session requests.
  - Skeleton loading states and animated toast alerts across all screens.
  - Mobile Progressive Web App (PWA) ready with `manifest.json`.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & Lucide React icons
- **Backend / Database:** [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Realtime, Storage RLS)
- **Voice Calling:** [Daily.co](https://daily.co/) REST API & Prebuilt Rooms
- **Deployment:** [Vercel](https://vercel.com/) with automated CI/CD

---

## 🚀 Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/viswa-20060207/SkillSwap.git
cd SkillSwap
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Optional: Add your Daily.co API key for voice calls
DAILY_API_KEY=<your-daily-api-key>
```

### 3. Database Migration
Apply the database schema and RLS policies located in [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) inside your Supabase project's **SQL Editor**.

Ensure the following buckets are created in **Supabase Storage**:
- `avatars` (Public bucket)
- `notes` (Private bucket)

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

To test mobile devices on the same local network:
```bash
npx next dev -H 0.0.0.0 -p 3000
```

---

## 🌐 Vercel Production Deployment

SkillSwap is configured for 1-click deployment on Vercel.

### Environment Variables for Vercel
When importing your repository into Vercel, add the following variables under **Project Settings -> Environment Variables**:

| Variable Name | Required | Description |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase Project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Your Supabase public anonymous API key |
| `DAILY_API_KEY` | Optional | Your Daily.co REST API key for live voice calls |

---

## 📱 Mobile App (PWA) Installation

SkillSwap supports native-like installation on Android and iOS devices:
1. Open your deployed Vercel URL in **Chrome** (Android) or **Safari** (iOS).
2. Tap the browser menu (`⋮` or Share icon) and select **"Install app"** or **"Add to Home Screen"**.
3. SkillSwap will install directly on your home screen with a standalone window and offline caching.

---

## 📄 License
MIT License. Built for seamless peer learning and skill sharing.
