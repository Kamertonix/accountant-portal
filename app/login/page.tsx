'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Card';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signUp') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.session) {
          // This Supabase project has email confirmation disabled
          // (same as the Flutter app's own CloudAccountService.signUpWithPassword)
          // — signUp already returns a live session, so there is no
          // email to wait for. Go straight on, same as a normal sign-in.
          router.replace('/onboarding');
          return;
        }
        setInfo('Account created. Check your email to confirm, then sign in.');
        setMode('signIn');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.replace('/onboarding');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm" tone="accent">
        <h1 className="text-xl font-bold text-textPrimary">Accountant Portal</h1>
        <p className="mt-1 text-sm text-textSecondary">Tax Sole Trader — read-only client access</p>

        <div className="mt-6 flex rounded-xl border border-border bg-input p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setMode('signIn')}
            className={`flex-1 rounded-lg py-2 ${mode === 'signIn' ? 'bg-accent text-white' : 'text-textMuted'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signUp')}
            className={`flex-1 rounded-lg py-2 ${mode === 'signUp' ? 'bg-accent text-white' : 'text-textMuted'}`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <label className="text-xs font-semibold text-textMuted">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
            />
          </label>
          <label className="text-xs font-semibold text-textMuted">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
            />
          </label>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          {info && <p className="text-sm font-medium text-success">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-lg bg-accent py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-xs text-textMuted">
          This portal is for accountants invited by a Tax Sole Trader client. If you&rsquo;re a client of the app itself, use the app instead.
        </p>
      </Card>
    </div>
  );
}
