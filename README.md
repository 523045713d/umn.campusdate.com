# Campus MVP

Activity-first campus matching prototype built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Current flow

`Home → Discover/Create → Plan → Join request → Creator approval → My Groups → Group overview → Group chat`

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

### 2026-09-26 (America/Chicago) — Join approval

- Students request to join an open plan; a pending request does not make them a member.
- The plan creator can approve or decline pending requests on the plan page. Approved students become members and can access their group. Declined students may request again.
- Database functions check creator ownership and group capacity inside a transaction. Direct membership inserts from the client are disabled, including the earlier unrestricted join route.
- Apply `supabase/migrations/002_join_approval.sql` after `001_auth.sql` and before deploying this branch. Existing confirmed members remain members; pending requests do not fill group slots.

### 2026-09-26 (America/Chicago) — Multiple groups

- My Groups now lists every plan where the signed-in student is a confirmed member, including plans they created. Each group has its own `/group/[id]` overview and direct link from the plan page.
- Group lists include plans regardless of open/closed status. Pending join requests do not appear until approved.
- Group membership is checked against the current user's confirmed `plan_members` records on every visit. No new database migration is required beyond the join approval migration.

### 2026-09-26 (America/Chicago) — Group chat

- Every group overview now has a separate chat. Confirmed members can read the latest 100 messages and send messages up to 2,000 characters; pending applicants cannot access it.
- Messages are stored in Supabase and update via Realtime when available, with a 15-second refresh fallback. Sender names come from confirmed membership records rather than client-supplied text.
- Apply `supabase/migrations/003_group_chat.sql` after `002_join_approval.sql` before deploying this branch. The migration adds member-only read access, a checked send function, and Realtime publication when available.
