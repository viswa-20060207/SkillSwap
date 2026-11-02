# SkillSwap - Engineering Rules & Guidelines (RULES.md)

## 1. Security & Database Access
- **Row Level Security (RLS) is Mandatory:**
  - Every table in PostgreSQL MUST have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
  - No database query should bypass RLS. All reads, inserts, updates, and deletes must have explicit security policies targeting authenticated user IDs (`auth.uid()`).
  - Private 1-on-1 session resources (messages, notes, files, sessions) must strictly permit access ONLY to the session's two participants (`requester_id` or `recipient_id`).
- **No Secrets in Client Code:**
  - Never expose `SUPABASE_SERVICE_ROLE_KEY` or any sensitive server credentials to client-side bundles or `NEXT_PUBLIC_*` environment variables.
  - Client-side code must solely use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Environment Variables:**
  - Real configuration and secrets reside exclusively in `.env.local` (which is git-ignored).
  - All expected keys must be documented in `.env.example` with clear placeholder descriptions.

---

## 2. Project Architecture & Folder Structure
Adhere strictly to the following folder conventions:
```
SkillSwap/
├── app/                  # Next.js 14 App Router routes, layouts, and page handlers
│   ├── (auth)/           # Authentication routes (login, register, forgot-password)
│   ├── (dashboard)/      # Authenticated user dashboard, search, profile views
│   ├── session/[id]/     # Private 1-on-1 real-time session room
│   ├── api/              # Route handlers (if server-only logic is needed)
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Tailwind base, components, utilities
├── components/           # Reusable, modular UI components only
│   ├── ui/               # Base primitives (Button, Input, Modal, Card, Badge, etc.)
│   ├── profile/          # Profile-specific widgets (ProfileHeader, SkillBadgeList, etc.)
│   ├── session/          # Session room widgets (VoiceCallPanel, ChatBox, CodeNotes, FileShare)
│   └── layout/           # Navbar, Sidebar, Footer, MobileNav
├── lib/                  # Shared utilities, Supabase clients, helpers, types
│   ├── supabase/         # Supabase client helpers (client.ts, server.ts, middleware.ts)
│   ├── utils.ts          # General helper functions (cn, formatting, debounce)
│   └── types/            # TypeScript database definitions and domain interfaces
└── supabase/
    └── migrations/       # SQL migration scripts for tables, RLS policies, triggers, and functions
```

---

## 3. UI/UX & Component Design Standards
- **Reusable Components Only:**
  - Build UI using modular, reusable components adhering to single responsibility.
  - Avoid inline duplicates of repeated styling patterns; encapsulate them into `components/ui/`.
- **Mobile-First Responsive Design:**
  - Design and test layout on mobile viewports first (`375px+`), expanding gracefully with Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
  - The private session room must provide smooth tabbed or collapsible navigation on mobile screens (switching seamlessly between voice controls, chat, notes, and file list).
- **TypeScript Strictness:**
  - Ensure full type safety across all components, API routes, and Supabase database interactions. Avoid `any`.

---

## 4. Development Workflow & Task Reporting
- **Every Task Ends with a Done Report:**
  - At the conclusion of every development task or feature implementation, a structured **Done Report** must be provided containing:
    1. **What was built:** Clear summary of new components, routes, database migrations, or functions.
    2. **How it was tested:** Verification steps performed (linting, build checks, manual flows, mobile viewport responsiveness, RLS policy verification).
