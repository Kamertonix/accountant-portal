'use client';

import Link from 'next/link';
import { usePortal } from '@/lib/portal-context';
import Card from '@/components/Card';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';

export default function InvitationsPage() {
  const { links, loading } = usePortal();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-textMuted">Loading…</div>;
  }

  const awaitingApproval = links.filter((l) => l.status === 'pending' && l.accountant_id);
  const past = links.filter((l) => l.status === 'revoked' || l.status === 'declined');

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-textPrimary">Invitations</h1>
          <p className="mt-1 max-w-xl text-sm text-textSecondary">
            Clients invite you, not the other way round — they generate a code in their own app and choose exactly what
            to share. Enter a code they&rsquo;ve given you to connect.
          </p>
        </div>
        <Link
          href="/redeem"
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
        >
          + Enter invite code
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-warning">Awaiting client approval</h2>
        {awaitingApproval.length === 0 ? (
          <p className="text-sm text-textMuted">Nothing pending — codes you&rsquo;ve redeemed will show here until your client confirms.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {awaitingApproval.map((link) => (
              <Card key={link.id} tone="warning">
                <div className="flex items-center gap-3">
                  <Avatar name={link.client_label || '?'} size={32} />
                  <div>
                    <p className="font-semibold text-textPrimary">{link.client_label || 'Unnamed client'}</p>
                    <p className="text-xs text-textMuted">Redeemed {new Date(link.invited_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-textMuted">History</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map((link) => (
              <Card key={link.id} className="opacity-60">
                <div className="flex items-center gap-3">
                  <Avatar name={link.client_label || '?'} size={32} />
                  <div>
                    <p className="font-semibold text-textPrimary">{link.client_label || 'Unnamed client'}</p>
                    <StatusBadge status={link.status} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
