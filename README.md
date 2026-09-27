# Campus MVP

Activity-first campus matching prototype built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Current flow

`Home → Discover/Create → Plan → Join → Group`

## Phase 1.1.3

This branch adds real Supabase authentication and user identity.

- Email/password sign up and login
- Logout from the navigation bar
- User profile page
- Authenticated plan creation
- Authenticated plan joining
- Plans and memberships store real Supabase Auth UUIDs
- Public discovery remains readable without logging in
- RLS migration for authenticated writes

## Local setup

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Then:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Database migration

Before testing Phase 1.1.3, run:

`supabase/migrations/001_auth.sql`

in the Supabase SQL Editor.

The migration creates the auth profile trigger, changes RLS so anonymous users can read plans while only authenticated users can create/join, and prevents duplicate plan membership for the same account.

## Deployment flow

Feature branches deploy as Vercel Preview deployments. Merge to `main` only after Preview testing passes; `main` remains the Production branch.

## Update log

### 2026-09-26 (America/Chicago) — Matching and recommendations

- Matching scores now use the signed-in student's courses, interests, and preferred group size instead of fixed mock scores. Profile settings can save courses and interests.
- Discover shows up to three recommended open plans with a shared course or interest, ranked by match score. Plans already joined, created by the student, or full are excluded. Everyone can still browse all plans.
- Without a signed-in profile or enough matching information, the UI gives a useful next step instead of inventing recommendations.
- Matching runs in the client with the existing Supabase profile and plan data; no database migration is needed. This version does not compare schedules because availability is not collected yet.
