'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';
import Card from '@/components/Card';

function OnboardingForm() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If this accountant already has a profile (returning sign-in),
    // skip straight to the dashboard instead of asking again.
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setChecking(false);
        return;
      }
      const { data } = await supabase.from('accountant_profiles').select('user_id').eq('user_id', userId).maybeSingle();
      if (data) {
        router.replace('/dashboard');
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const { error: fnError } = await supabase.functions.invoke('accountant-signup', {
        body: { display_name: displayName.trim(), firm_name: firmName.trim() },
      });
      if (fnError) throw fnError;
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-textMuted">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm" tone="accent">
        <h1 className="text-xl font-bold text-textPrimary">Set up your profile</h1>
        <p className="mt-1 text-sm text-textSecondary">
          This is what your clients see when deciding whether to approve your access.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <label className="text-xs font-semibold text-textMuted">
            Your name
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Smith"
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
            />
          </label>
          <label className="text-xs font-semibold text-textMuted">
            Firm name (optional)
            <input
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="Smith & Co Accountants"
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
            />
          </label>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-lg bg-accent py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return <AuthGuard>{() => <OnboardingForm />}</AuthGuard>;
}
