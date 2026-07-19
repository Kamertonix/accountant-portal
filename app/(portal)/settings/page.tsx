'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePortal } from '@/lib/portal-context';
import Card from '@/components/Card';

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-semibold text-textMuted">
      {label}
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
      />
    </label>
  );
}

export default function SettingsPage() {
  const { firmName, displayName, firmAddress, firmPhone, firmWebsite, professionalBody, refresh } = usePortal();
  const [name, setName] = useState('');
  const [firm, setFirm] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(displayName);
    setFirm(firmName);
    setAddress(firmAddress);
    setPhone(firmPhone);
    setWebsite(firmWebsite);
    setBody(professionalBody);
  }, [displayName, firmName, firmAddress, firmPhone, firmWebsite, professionalBody]);

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
        body: {
          display_name: name.trim(),
          firm_name: firm.trim(),
          firm_address: address.trim(),
          firm_phone: phone.trim(),
          firm_website: website.trim(),
          professional_body: body.trim(),
        },
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

      <Card className="mt-6 max-w-xl" tone="accent">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <p className="mb-3 text-sm font-bold text-textPrimary">Your details</p>
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-textMuted">
                Email
                <input
                  disabled
                  value={email}
                  className="mt-1 w-full cursor-not-allowed rounded-lg border border-border bg-input/50 px-3 py-2 text-sm text-textMuted"
                />
              </label>
              <Field label="Your name" value={name} onChange={setName} required />
              <Field label="Professional body / membership no." value={body} onChange={setBody} placeholder="e.g. ACCA 1234567" />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-bold text-textPrimary">Firm details</p>
            <div className="flex flex-col gap-3">
              <Field label="Firm name" value={firm} onChange={setFirm} />
              <Field label="Firm address" value={address} onChange={setAddress} placeholder="Street, city, postcode" />
              <Field label="Phone" value={phone} onChange={setPhone} placeholder="+44…" />
              <Field label="Website" value={website} onChange={setWebsite} placeholder="https://…" />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          {saved && <p className="text-sm font-medium text-success">Saved.</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </Card>
    </div>
  );
}
