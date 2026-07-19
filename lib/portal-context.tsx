'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AccountantLinkRow } from '@/lib/types';

interface PortalContextValue {
  links: AccountantLinkRow[];
  loading: boolean;
  firmName: string;
  displayName: string;
  refresh: () => Promise<void>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

/// Fetches the accountant's own links + profile once, on mount, and
/// exposes them to every page inside the (portal) layout. This is what
/// makes switching between clients instant — the sidebar and the
/// client-detail page both read from the same already-fetched list
/// instead of each page re-querying Supabase on every navigation.
export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [links, setLinks] = useState<AccountantLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [firmName, setFirmName] = useState('');
  const [displayName, setDisplayName] = useState('');

  const refresh = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const [{ data: profile }, { data: rows }] = await Promise.all([
      supabase.from('accountant_profiles').select('display_name, firm_name').eq('user_id', userId).maybeSingle(),
      supabase.from('accountant_links').select('*').eq('accountant_id', userId).order('updated_at', { ascending: false }),
    ]);
    setFirmName(profile?.firm_name ?? '');
    setDisplayName(profile?.display_name ?? '');
    setLinks((rows as AccountantLinkRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PortalContext.Provider value={{ links, loading, firmName, displayName, refresh }}>{children}</PortalContext.Provider>
  );
}

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside PortalProvider');
  return ctx;
}
