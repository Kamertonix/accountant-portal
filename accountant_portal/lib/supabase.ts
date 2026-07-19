'use client';

import { createClient } from '@supabase/supabase-js';

// Same split as the Flutter app: anon key only, in the browser.
// Every write that matters (creating an accountant profile, redeeming
// an invite, syncing data) goes through the Edge Functions with
// service_role — never through this client directly. This client is
// only ever used for: (1) Supabase Auth (sign up / sign in as an
// accountant) and (2) reading rows RLS already allows an accountant to
// read directly (accountant_links, accountant_data_snapshots).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Loud failure on purpose — a silently-missing env var here would
  // otherwise show up as a confusing "not signed in" everywhere.
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Set them in .env.local (see README.md).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
