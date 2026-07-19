'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { usePortal } from '@/lib/portal-context';
import Card from '@/components/Card';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { grantedCategories } from '@/lib/types';

export default function ClientsPage() {
  const { links, loading } = usePortal();
  const [query, setQuery] = useState('');

  const accepted = useMemo(
    () =>
      links
        .filter((l) => l.status === 'accepted')
        .filter((l) => l.client_label.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.client_label.localeCompare(b.client_label)),
    [links, query],
  );

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-textMuted">Loading…</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-textPrimary">Clients</h1>
      <p className="mt-1 text-sm text-textSecondary">Every client who has approved read-only access.</p>

      <div className="relative mt-5 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="w-full rounded-lg border border-border bg-input py-2 pl-9 pr-3 text-sm text-textPrimary outline-none focus:border-accentStroke"
        />
      </div>

      {accepted.length === 0 ? (
        <Card className="mt-6 max-w-md text-center">
          <p className="text-sm text-textSecondary">{query ? 'No matches.' : 'No clients connected yet.'}</p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accepted.map((link) => (
            <Link key={link.id} href={`/clients/${link.id}`}>
              <Card className="h-full cursor-pointer transition hover:-translate-y-0.5 hover:border-accentStroke">
                <div className="flex items-center gap-3">
                  <Avatar name={link.client_label || '?'} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-textPrimary">{link.client_label || 'Unnamed client'}</p>
                    <StatusBadge status={link.status} />
                  </div>
                </div>
                <p className="mt-3 text-xs text-textMuted">
                  {grantedCategories(link).length} categories shared &middot; since{' '}
                  {link.accepted_at ? new Date(link.accepted_at).toLocaleDateString() : '—'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
