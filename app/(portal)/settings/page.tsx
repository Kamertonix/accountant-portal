'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePortal } from '@/lib/portal-context';
import Card from '@/components/Card';

export default function SettingsPage() {
  const { firmName, displayName, refresh } = usePortal();
  const [name, setName] = useState('');
  const [firm, setFirm] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(displayName);
    setFirm(firmName);
  }, [displayName, firmName]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const { error: fnError } = await supabase.functions.invoke('accountant-signup', {
        body: { display_name: name.trim(), firm_name: firm.trim() },
      });
      if (fnError) throw fnError;
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-textPrimary">Settings</h1>
      <p className="mt-1 text-sm text-textSecondary">This is what your clients see when deciding whether to approve your access.</p>

      <Card className="mt-6 max-w-md" tone="accent">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-textMuted">
            Email
            <input
              disabled
              value={email}
              className="mt-1 w-full cursor-not-allowed rounded-lg border border-border bg-input/50 px-3 py-2 text-sm text-textMuted"
            />
          </label>
          <label className="text-xs font-semibold text-textMuted">
            Your name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
            />
          </label>
          <label className="text-xs font-semibold text-textMuted">
            Firm name
            <input
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
            />
          </label>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          {saved && <p className="text-sm font-medium text-success">Saved.</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </Card>
    </div>
  );
}
