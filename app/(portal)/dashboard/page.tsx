'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Mail, Search, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePortal } from '@/lib/portal-context';
import Card from '@/components/Card';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { CATEGORY_LABELS, type AccountantCategory } from '@/lib/types';

interface ActivityRow {
  id: string;
  user_id: string;
  category: AccountantCategory;
  viewed_at: string;
}

export default function DashboardPage() {
  const { links, loading, displayName } = usePortal();
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('accountant_access_log')
        .select('id, user_id, category, viewed_at')
        .order('viewed_at', { ascending: false })
        .limit(6);
      setActivity((data as ActivityRow[]) ?? []);
    })();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-textMuted">Loading…</div>;
  }

  const accepted = links.filter((l) => l.status === 'accepted');
  const pending = links.filter((l) => l.status === 'pending' && l.accountant_id);
  const recentClients = [...accepted].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
  const labelFor = (userId: string) => links.find((l) => l.user_id === userId)?.client_label || 'A client';

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-textPrimary">Welcome back{displayName ? `, ${displayName.split(' ')[0]}` : ''}!</h1>
      <p className="mt-1 text-sm text-textSecondary">Here&rsquo;s what&rsquo;s happening today.</p>

      <Link
        href="/clients"
        className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-input px-4 py-3 text-sm text-textMuted transition hover:border-accentStroke"
      >
        <Search size={16} /> Search clients…
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accentLight">
              <Users size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-textPrimary">{accepted.length}</p>
              <p className="text-xs text-textMuted">Total clients</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/15 text-warning">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-textPrimary">{pending.length}</p>
              <p className="text-xs text-textMuted">Pending invitations</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-textPrimary">Recent clients</h2>
            <Link href="/clients" className="text-xs font-semibold text-accentLight hover:underline">
              View all →
            </Link>
          </div>
          <Card padded={false} className="divide-y divide-border">
            {recentClients.length === 0 ? (
              <p className="p-5 text-sm text-textMuted">No clients connected yet.</p>
            ) : (
              recentClients.map((link) => (
                <Link
                  key={link.id}
                  href={`/clients/${link.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.02]"
                >
                  <Avatar name={link.client_label || '?'} size={32} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-textPrimary">{link.client_label || 'Unnamed client'}</p>
                    <StatusBadge status={link.status} />
                  </div>
                  <ArrowRight size={16} className="text-textMuted" />
                </Link>
              ))
            )}
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold text-textPrimary">Recent activity</h2>
          <Card padded={false} className="divide-y divide-border">
            {activity.length === 0 ? (
              <p className="p-5 text-sm text-textMuted">No activity yet.</p>
            ) : (
              activity.map((row) => (
                <div key={row.id} className="px-4 py-3">
                  <p className="text-sm text-textPrimary">
                    Viewed <span className="font-semibold">{CATEGORY_LABELS[row.category]}</span>
                  </p>
                  <p className="text-xs text-textMuted">
                    {labelFor(row.user_id)} &middot; {new Date(row.viewed_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
