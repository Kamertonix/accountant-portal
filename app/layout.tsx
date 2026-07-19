import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Accountant Portal — Tax Sole Trader',
  description: 'Read-only, live view of your clients\u2019 tax data.',
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
