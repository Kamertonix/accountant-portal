'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import { PortalProvider } from '@/lib/portal-context';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {() => (
        <PortalProvider>
          <div className="flex">
            <Sidebar />
            <main className="h-screen flex-1 overflow-y-auto">{children}</main>
          </div>
        </PortalProvider>
      )}
    </AuthGuard>
  );
}
