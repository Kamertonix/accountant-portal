# Tax Sole Trader — Accountant Portal

Read-only web portal for accountants invited by a Tax Sole Trader app
user. Same Supabase project as the app — no new backend, just a new
front door for a different kind of user (accountants instead of
self-employed clients).

## 1. Install

```bash
npm install
```

## 2. Configure environment variables

Create `.env.local` in this folder:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
```

Same values as the Flutter app's `--dart-define=SUPABASE_URL=...` /
`SUPABASE_ANON_KEY=...` — this is the same Supabase project, just the
public/anon key, never the service role key (that only lives inside
the Edge Functions, on Supabase's own servers).

## 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000 — should redirect to `/login`.

To test the full loop locally:
1. Sign up as an accountant (creates a Supabase Auth user + prompts
   for firm name → calls `accountant-signup`)
2. In the app, go to **Reports → Invite Accountant (Live Access)**,
   generate a code
3. Back in the portal, **Connect a client**, enter the code
4. In the app, approve the request
5. Back in the portal, the client appears on `/dashboard` — click in to
   see their shared categories

## 4. Deploy

This is a separate Vercel project from `taxsoletrader-site` — same
account, different repo/project, so a deploy here never touches the
marketing site's build.

1. Push this folder to its own git repo
2. Import it in Vercel as a new project
3. Add the two environment variables from step 2 in Vercel's Project
   Settings → Environment Variables
4. Deploy

## 5. Custom domain

Project Settings → Domains → add `accountant.taxsoletrader.com`.
Vercel will show a CNAME record (usually pointing at
`cname.vercel-dns.com`) — add that at wherever `taxsoletrader.com`'s
DNS is managed. Propagation is usually minutes, sometimes a couple of
hours.

## What this portal does NOT do

- Cannot write, edit, or delete anything — every table it reads from
  has no INSERT/UPDATE/DELETE grant for the `authenticated` role at
  all. Every mutation (redeeming a code, syncing data) happens through
  the same Edge Functions the app uses, with `service_role`.
- Does not show live/unsynced data — only whatever the client
  explicitly pushed with "Sync now" in their own app.
- Does not identify clients by email — only by the display name/business
  name the client chose to share (`client_label` on `accountant_links`).
- Does not compute VAT/CIS liability figures — the summary cards show
  simple income/expense sums only, never scheme-dependent tax
  calculations, to avoid ever showing an accountant a wrong figure to
  file on. Official filing figures live in the client's own app reports.

## Layout

- `app/(portal)/layout.tsx` — the persistent sidebar shell (client list,
  search, sign out) wrapping every authenticated page. Client list is
  fetched once via `lib/portal-context.tsx` and shared, so switching
  between clients is instant — no per-navigation refetch.
- `app/(portal)/dashboard` — landing state (empty / "select a client" /
  pending approvals).
- `app/(portal)/clients/[linkId]` — the actual working screen: financial
  summary cards, category tabs, sortable/searchable table with CSV
  export. All granted categories for a client are fetched in one query
  when you open them, so tab switching doesn't hit the network again.
- `app/login`, `app/onboarding`, `app/redeem` — outside the sidebar
  shell, since they run before there's anything to show in it.

## Architecture reference

See the main app repo's `docs/` for the full accountant-access design:
- `015_accountant_access_foundation.sql` through `018_...` — schema + RLS
- `supabase/functions/accountant-*` — the seven Edge Functions this
  portal and the app both call
- `lib/services/accountant_access_service.dart` — the app-side
  counterpart to this portal
