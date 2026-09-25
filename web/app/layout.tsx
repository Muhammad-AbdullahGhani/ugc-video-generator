import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ReelForge',
  description: 'Paste a product link. Get a short UGC reel.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
