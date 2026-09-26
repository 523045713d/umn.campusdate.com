# Campus MVP v1

First local MVP for the campus activity matching project.

This version intentionally does **not** use GitHub, Supabase, or a real backend yet. It validates the product flow first.

## What works
- Landing page
- Discover plans
- Create a plan
- Plan detail
- Match score + reasons
- Join plan
- Group page
- Suggested plan
- Browser persistence with localStorage

## Run locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## MVP flow
`Home → Discover/Create → Plan → Join → Group`

## Current architecture
`Next.js + TypeScript + Tailwind → localStorage`

## Next version
1. Supabase
2. Real accounts
3. PostgreSQL plans
4. Join requests
5. Deterministic matching service
6. Optional AI plan generation
