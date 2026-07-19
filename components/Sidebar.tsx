'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Mail, Settings, ChevronDown, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePortal } from '@/lib/portal-context';
import Avatar from './Avatar';
import PortalFooter from './PortalFooter';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/invitations', label: 'Invitations', icon: Mail },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { links, firmName, displayName } = usePortal();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const pendingCount = links.filter((l) => l.status === 'pending' && l.accountant_id).length;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-5 py-5">
        <Link href="/dashboard">
          <Image src="/logo-header.png" alt="Tax Sole Trader" width={420} height={110} priority className="h-auto w-[170px]" />
        </Link>
        <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-textMuted">Accountant Portal</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          const badge = href === '/invitations' && pendingCount > 0 ? pendingCount : null;
          return (
            <Link
              key={href}
              href={href}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                active ? 'bg-accent/15 text-accentLight' : 'text-textSecondary hover:bg-white/[0.04] hover:text-textPrimary'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {badge !== null && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-border p-3">
        {menuOpen && (
          <button
            onClick={handleSignOut}
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-danger transition hover:bg-danger/10"
          >
            <LogOut size={16} /> Sign out
          </button>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.04]"
        >
          <Avatar name={displayName || firmName || '?'} size={34} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-textPrimary">{displayName || 'Accountant'}</p>
            <p className="truncate text-[11px] text-textMuted">{firmName || 'Accountant'}</p>
          </div>
          <ChevronDown size={16} className={`shrink-0 text-textMuted transition ${menuOpen ? 'rotate-180' : ''}`} />
        </button>
        <PortalFooter compact />
      </div>
    </aside>
  );
}
