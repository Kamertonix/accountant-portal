'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';
import Card from '@/components/Card';
import PortalFooter from '@/components/PortalFooter';

function RedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('accountant-redeem-invite', {
        body: { invite_code: code.trim().toUpperCase() },
      });
      if (fnError) throw fnError;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <Card className="w-full max-w-sm text-center" tone="success">
          <h1 className="text-xl font-bold text-textPrimary">Code accepted</h1>
          <p className="mt-2 text-sm text-textSecondary">
            Your client still needs to confirm the connection in their own app before you can see anything. You&rsquo;ll
            see them appear on your dashboard once they do.
          </p>
          <button
            onClick={() => router.replace('/dashboard')}
            className="mt-5 w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            Go to dashboard
          </button>
        </Card>
        <PortalFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm" tone="accent">
        <h1 className="text-xl font-bold text-textPrimary">Connect a client</h1>
        <p className="mt-1 text-sm text-textSecondary">
          Enter the invite code your client gave you from their Tax Sole Trader app.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="E.g. 7XQK4M2P"
            maxLength={12}
            className="w-full rounded-lg border border-border bg-input px-3 py-3 text-center text-lg font-bold tracking-[0.3em] text-textPrimary outline-none focus:border-accentStroke"
          />

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-lg bg-accent py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Redeem code'}
          </button>
        </form>
      </Card>
      <PortalFooter />
    </div>
  );
}

export default function RedeemPage() {
  return <AuthGuard>{() => <RedeemForm />}</AuthGuard>;
}
