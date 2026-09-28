# CampusCrew

Activity-first campus matching prototype built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Current flow

`Home → Discover/Create → Plan → Join request → Creator approval → My Groups → Group overview → AI plan / Group chat → Notifications`

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

# Server-only importer credentials. Never use a NEXT_PUBLIC_ prefix.
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
UMN_EVENTS_FEED_URL=https://events.tc.umn.edu/live/json/events/max/250

# Server-only AI planning key. Never use a NEXT_PUBLIC_ prefix.
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite
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

### 2026-09-26 (America/Chicago) — AI planning

- A group creator can generate one shared activity plan with preparation items, a timed agenda, and a backup plan. Confirmed group members can view the saved plan in their group overview.
- Generation uses the Gemini API with structured JSON output. Only the activity title, description, category, time, location, duration, and group size are sent; chat messages and member names are excluded. The API key stays on the server.
- Set server-side `GEMINI_API_KEY` and optionally `GEMINI_MODEL` (default `gemini-3.5-flash-lite`) in deployment settings. The free tier may use submitted data to improve Google's products. Apply `supabase/migrations/004_ai_planning.sql` after `003_group_chat.sql` before deploying this branch. No plan can be generated until both are configured.

### 2026-09-26 (America/Chicago) — Interests matching

- Creators can add up to 10 comma-separated interest tags when publishing a plan. Tags appear on discovery cards and plan details.
- Matching compares a student's saved profile interests to plan tags without case sensitivity or punctuation differences, including non-English interests. Shared interests appear as matching reasons and receive a higher score than course overlap. Existing plans without tags continue to match interests mentioned in their title, description, or category.
- Apply `supabase/migrations/005_interests_matching.sql` after `004_ai_planning.sql` before deploying this branch. Students can set or update their interests on the Profile page; no AI service is needed for interest matching.

### 2026-09-26 (America/Chicago) — Course matching

- Creators can add up to 10 course codes to a plan. Course labels appear on discovery cards and plan details; students can manage their own courses on the Profile page.
- Matching compares course codes without case, spaces, or punctuation differences, so `CSCI 4041` and `csci-4041` match. The matching reason lists up to three shared courses; plans without course labels still match course names mentioned in the title, description, or category. Interest matching and recommendations continue to work.
- Apply `supabase/migrations/006_course_matching.sql` after `005_interests_matching.sql` before deploying this branch. No external matching service or key is required.

### 2026-09-26 (America/Chicago) — Availability matching

- Students can select weekly availability on their Profile page in four six-hour periods for each weekday. Their time zone is recorded from the browser when availability is first saved, and saved settings continue to use that time zone.
- New activities require a future start date and time. Matching converts the activity timestamp into the student's saved time zone, checks the weekday and start-time period, and adds a visible availability reason and 25 points when it fits. Recommendations can now include an activity that matches on availability alone, and exclude activities whose scheduled start has passed.
- Older activities retain their readable time text and are never assigned a guessed availability match. The period represents when an activity *starts*, not whether the whole activity fits the student's schedule.
- Apply `supabase/migrations/007_availability_matching.sql` after `006_course_matching.sql` before deploying this branch; no external API key is needed.

### 2026-09-26 (America/Chicago) — Notifications

- Signed-in students receive in-app notifications when someone requests to join their plan, when their join request is approved or declined, and when another confirmed member sends a group chat message. Chat notifications include the sender and group name, without copying the message body.
- The navigation bar shows an unread count. `/notifications` lists the latest 100 notifications, opens the related plan or group, and marks the opened notification as read. Realtime updates are used where available, with a 20-second refresh fallback.
- Notifications are created by database triggers as part of the original request, review, or message transaction. Row-level security limits reads to the recipient; a checked database function marks only the signed-in recipient's notifications as read. Existing historical events are not backfilled.
- Apply `supabase/migrations/008_notifications.sql` after `007_availability_matching.sql` before deploying this branch. This is an in-app inbox; it does not send email or push messages.

### 2026-09-27 (America/Chicago) — CampusCrew branding

- Renamed the visible project name, browser title, and npm package to CampusCrew.
- Added a compact two-ring SVG mark to the navigation bar and browser tab. The editable asset is `public/campuscrew-mark.svg`; no database migration or new environment variable is required.

### 2026-09-27 (America/Chicago) — UMN-inspired logo colors

- Updated the original CampusCrew two-ring logo to a maroon `#6D001F` background and gold `#FFCC33` accent, using the University of Minnesota's current color palette. The logo remains an original CampusCrew design, rather than a university mark.

### 2026-09-27 (America/Chicago) — Others category

- Renamed the `Build` activity category to `Others` in the creation form, discovery filter, activity cards, and demo data. Until the migration runs, existing `Build` plans also appear as `Others` in the app.
- Apply `supabase/migrations/009_others_category.sql` after `008_notifications.sql` to rename existing database rows. The migration only changes the category label; it preserves the plans and their members.

### 2026-09-27 (America/Chicago) — Plan deletion and administrator roles

- Plan creators can permanently delete their own plans from the plan page. Administrators can delete any plan from the plan page or `/admin`. Deletion also removes associated group content, memberships, requests, chat messages, and notifications through existing database cascades; both screens ask for confirmation.
- `/admin` lists users and plans and lets an administrator grant or remove administrator roles. Administrators cannot remove their own role. Database functions check permissions for every role change and deletion; direct profile updates cannot change the role column.
- Apply `supabase/migrations/010_plan_management.sql` after `009_others_category.sql`. To initialize the **first** administrator, sign up normally, then run this **once in the Supabase SQL Editor** as a database owner, replacing the UUID with that account's Auth user ID:

  ```sql
  update public.users set role = 'admin' where id = '<YOUR_AUTH_USER_UUID>'::uuid;
  ```

  Subsequent administrators can be assigned from `/admin`. No service role key is exposed to the browser.

#### Deployment check for Others and deletion

- The deployed application must include both the `Others` UI and the `delete_plan` call (this branch or a later branch containing it). A deployment still built from an earlier branch, including `main` before these updates are merged, will keep its old category list.
- Run `009_others_category.sql` and `010_plan_management.sql` in the **same Supabase project** configured for that deployment, in that order. `009` renames existing `Build` rows; `010` installs the checked `delete_plan` function. If deletion fails, the page now displays the database error or points out a missing migration instead of only saying "Could not delete plan."

### 2026-09-27 (America/Chicago) — UMN calendar event discovery

- `/events` lists upcoming public events imported from the official UMN Events Calendar JSON feed. Each card identifies the source, the original organizer, and `CampusDate Event Importer`; CampusCrew never represents the imported event as a student-created or University-operated CampusCrew account.
- Students select **Find people to go with** to open a prefilled Plan form. The signed-in student becomes the real Plan creator, and the resulting Plan keeps a link to the original UMN event for current registration, cost, eligibility, schedule, and cancellation details.
- The importer stores only basic event facts, taxonomy labels, and the original source URL. It does not copy event descriptions, images, or contact details.
- Apply `supabase/migrations/011_external_events.sql` after `010_plan_management.sql`. Add `SUPABASE_SERVICE_ROLE_KEY` and a strong `CRON_SECRET` as server-only Vercel environment variables. `UMN_EVENTS_FEED_URL` is optional and is restricted in code to the official `events.tc.umn.edu/live/json/events` endpoint.
- `vercel.json` calls `/api/cron/umn-events` daily at 12:00 UTC. Vercel sends `Authorization: Bearer <CRON_SECRET>`. To run the first import manually after deployment:

  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" \
    https://YOUR-DEPLOYMENT.vercel.app/api/cron/umn-events
  ```

- Imported rows are read-only to browser users through RLS. Only the server-side service role can insert or update them. Each recurring event occurrence receives a stable source ID plus start timestamp, so occurrences are not collapsed or duplicated on later imports. Events are marked expired after their reported end, or after a conservative fallback window when the source has no end time.
