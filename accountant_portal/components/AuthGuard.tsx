'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/// Wraps any page that requires a signed-in accountant. Mirrors the
/// Flutter app's own pattern (every HMRC/Accountant Access screen
/// checks `client.auth.currentSession` before doing anything) — no
/// page here trusts a URL alone, every one re-checks the real session.
export default function AuthGuard({ children }: { children: (session: Session) => React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | 'loading'>('loading');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
      } else {
        setSession(data.session);
      }
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        router.replace('/login');
      } else {
        setSession(nextSession);
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [router]);

  if (session === 'loading' || session === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-textMuted">
        Loading…
      </div>
    );
  }

  return <>{children(session)}</>;
}
