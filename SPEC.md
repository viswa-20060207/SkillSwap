# SkillSwap - Product Specification (SPEC.md)

## 1. Overview
SkillSwap is a peer-to-peer (P2P), 1-on-1 mutual learning platform where users teach what they know and learn what they want to master. Designed with a LinkedIn-style professional profile aesthetic, users can showcase their expertise, discover learning partners, connect, and collaborate in dedicated, real-time private virtual session rooms equipped with voice calling, messaging, and note/code sharing.

---

## 2. Core User Journey

1. **Sign Up & Profile Setup:**
   - User creates an account via Supabase Auth (Email/Password or OAuth).
   - User customizes a LinkedIn-style profile: avatar, full name, headline, bio, experience/education.
   - User selects **Skills to Teach** (proficiency level, description) and **Skills to Learn** (target goal).

2. **Discover & Search:**
   - Search for specific skills (e.g., C, C++, Python, Java, Communication, Interview Skills, English Speaking).
   - Filter by skill type (Technical vs. Soft Skills) and search queries.
   - View matching user cards displaying avatar, headline, teaching skills, and learning interests.

3. **Follow & Request Session:**
   - Follow users to stay updated with their profile and teaching offerings.
   - Send a 1-on-1 **Session Request** with an agenda, proposed topic, and preferred time.
   - The recipient receives notifications and can Accept or Decline the request.

4. **1-on-1 Private Session Room:**
   - Once a session is **Accepted**, both users gain access to a private, secure session room (`/session/[id]`).
   - The session room features:
     - **WebRTC Voice Call:** Low-latency 1-to-1 audio connection with mute/unmute controls.
     - **Realtime Chat:** Instant messaging powered by Supabase Realtime channels.
     - **Notes & Code Sharing:** Shared notebook supporting rich notes, code snippets with syntax highlighting, and file attachments.

---

## 3. Skill Catalog & Taxonomy

### Technical Skills
- C
- C++
- Python
- Java
- JavaScript / TypeScript
- Data Structures & Algorithms
- Web Development / Databases

### Soft Skills & Career
- Communication
- Interview Preparation / Mock Interviews
- English Speaking & Pronunciation
- Leadership & Public Speaking
- Resume Review & Career Guidance

---

## 4. Key Functional Modules

### 4.1 Authentication & User Management
- Supabase Auth integration with cookie-based session handling via `@supabase/ssr`.
- Protected routes using Next.js Middleware.
- Automatic creation of a profile row in `profiles` upon user sign-up via Supabase trigger.

### 4.2 LinkedIn-Style Profile System
- **Profile Header:** Avatar, Banner image, Full Name, Professional Headline, Location, Follower/Following counts.
- **About Section:** Rich bio and learning philosophy.
- **Skills Offered (Teaching):** Badges with proficiency ratings (Beginner, Intermediate, Advanced, Expert).
- **Skills Wanted (Learning):** Badges with current learning objectives.
- **Activity & Reputation:** Completed session count, peer ratings, and reviews.

### 4.3 Search, Filtering & Discovery
- Full-text search on skills and profiles.
- Bi-directional matching: matches users who teach what you want to learn, and vice versa.
- Clean responsive grid cards highlighting matching tags.

### 4.4 Connections & Follow System
- Follow/Unfollow mechanism.
- Followers and Following lists.

### 4.5 Session Request & Management Lifecycle
- **Statuses:** `pending` -> `accepted` | `rejected` | `cancelled` | `completed`.
- Session request modal with topic, description, proposed schedule.
- Dashboard for viewing incoming and outgoing session requests.

### 4.6 Private 1-on-1 Session Room (`/session/[id]`)
- **Access Control:** Restricted strictly to the requester and the recipient through Supabase RLS.
- **WebRTC Voice Calling:**
  - Direct P2P audio streaming between participants.
  - Signaling handled over Supabase Realtime Broadcast channels (offer, answer, ICE candidates).
  - Audio mute/unmute and call duration indicator.
- **Realtime Chat:**
  - Ephemeral and persisted chat history.
  - Typing indicators and delivered/read indicators.
- **Notes & Code Sharing:**
  - Collaborative markdown/code snippet board.
  - Code snippet syntax highlighting for C, C++, Python, Java, etc.
  - File attachment uploads backed by Supabase Storage bucket with RLS.

---

## 5. Database Schema & Architecture

- **`profiles`**: `id` (references auth.users), `full_name`, `headline`, `bio`, `avatar_url`, `location`, `created_at`, `updated_at`.
- **`skills`**: `id`, `name`, `category` ('technical' | 'soft_skill'), `created_at`.
- **`user_skills`**: `id`, `user_id`, `skill_id`, `type` ('teach' | 'learn'), `proficiency_level`.
- **`follows`**: `follower_id`, `following_id`, `created_at`.
- **`sessions`**: `id`, `requester_id`, `recipient_id`, `skill_id`, `topic`, `description`, `status`, `scheduled_at`, `created_at`, `updated_at`.
- **`session_messages`**: `id`, `session_id`, `sender_id`, `content`, `created_at`.
- **`session_notes`**: `id`, `session_id`, `author_id`, `title`, `content`, `note_type` ('markdown' | 'code'), `language`, `created_at`, `updated_at`.
- **`session_files`**: `id`, `session_id`, `uploader_id`, `file_name`, `file_url`, `file_size`, `mime_type`, `created_at`.

---

## 6. Technical Stack & Libraries

- **Framework:** Next.js 14 (App Router, React 18, TypeScript)
- **Styling:** Tailwind CSS (Mobile-first, responsive)
- **Icons & UI:** Lucide React, Headless UI / Radix primitives
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Auth SSR)
- **Realtime & Storage:** Supabase Realtime (WebSockets) & Supabase Storage
- **Audio Calling:** WebRTC (RTCPeerConnection + Supabase Realtime signaling)
- **Code Highlighting:** PrismJS / Highlight.js / Monaco / simple code editor
