import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { Sidebar } from '@/components/Sidebar';
import { MobileNavBar } from '@/components/MobileNavBar';

export const metadata: Metadata = {
  title: 'Smart Home Expense Tracker | Household Financial Intelligence',
  description: 'Intelligent multi-format household expense tracker with automatic bank statement classification, duplicate detection, and financial analytics.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Smart Expense',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="h-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased overflow-hidden">
        <ThemeProvider>
          <Sidebar />
          <main className="flex-1 h-full overflow-y-auto flex flex-col pb-20 md:pb-0">
            {children}
          </main>
          <MobileNavBar />
        </ThemeProvider>
      </body>
    </html>
  );
}
