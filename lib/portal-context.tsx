'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AccountantLinkRow } from '@/lib/types';
import type { PeriodOption } from '@/lib/period';

interface PortalContextValue {
  links: AccountantLinkRow[];
  loading: boolean;
  firmName: string;
  displayName: string;
  firmAddress: string;
  firmPhone: string;
  firmWebsite: string;
  professionalBody: string;
  refresh: () => Promise<void>;
  // Which client's workspace is currently open, and which tab within
  // it — lives here (not local page state) so the sidebar can show a
  // matching set of category shortcuts + highlight the active one
  // without needing URL search params (which would force a Suspense
  // boundary around the whole sidebar for every page, not just this
  // one). Null/null when not viewing a client workspace.
  activeClientId: string | null;
  activeCategoryTab: string | null;
  setActiveClientTab: (clientId: string | null, tab: string | null) => void;
  // A shortcut (e.g. sidebar's "VAT Return"/"MTD Report") sets this
  // right before switching the active tab to 'transactions', so the
  // workspace page can apply it once and clear it — a one-shot signal,
  // not persistent state, since the user is free to change filters
  // afterwards.
  pendingTypeFilter: 'all' | 'Income' | 'Expense' | 'vat' | 'cis' | null;
  pendingPeriod: PeriodOption | null;
  setPendingFilter: (typeFilter: 'all' | 'Income' | 'Expense' | 'vat' | 'cis' | null, period: PeriodOption | null) => void;
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
  const [firmAddress, setFirmAddress] = useState('');
  const [firmPhone, setFirmPhone] = useState('');
  const [firmWebsite, setFirmWebsite] = useState('');
  const [professionalBody, setProfessionalBody] = useState('');
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string | null>(null);
  const [pendingTypeFilter, setPendingTypeFilter] = useState<'all' | 'Income' | 'Expense' | 'vat' | 'cis' | null>(null);
  const [pendingPeriod, setPendingPeriod] = useState<PeriodOption | null>(null);

  const setActiveClientTab = useCallback((clientId: string | null, tab: string | null) => {
    setActiveClientId(clientId);
    setActiveCategoryTab(tab);
  }, []);

  const setPendingFilter = useCallback(
    (typeFilter: 'all' | 'Income' | 'Expense' | 'vat' | 'cis' | null, period: PeriodOption | null) => {
      setPendingTypeFilter(typeFilter);
      setPendingPeriod(period);
    },
    [],
  );

  const refresh = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const [{ data: profile }, { data: rows }] = await Promise.all([
      supabase
        .from('accountant_profiles')
        .select('display_name, firm_name, firm_address, firm_phone, firm_website, professional_body')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('accountant_links').select('*').eq('accountant_id', userId).order('updated_at', { ascending: false }),
    ]);
    setFirmName(profile?.firm_name ?? '');
    setDisplayName(profile?.display_name ?? '');
    setFirmAddress(profile?.firm_address ?? '');
    setFirmPhone(profile?.firm_phone ?? '');
    setFirmWebsite(profile?.firm_website ?? '');
    setProfessionalBody(profile?.professional_body ?? '');
    setLinks((rows as AccountantLinkRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PortalContext.Provider
      value={{
        links,
        loading,
        firmName,
        displayName,
        firmAddress,
        firmPhone,
        firmWebsite,
        professionalBody,
        refresh,
        activeClientId,
        activeCategoryTab,
        setActiveClientTab,
        pendingTypeFilter,
        pendingPeriod,
        setPendingFilter,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside PortalProvider');
  return ctx;
}
