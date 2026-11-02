import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Smart Home Expense Tracker | Household Financial Intelligence',
  description: 'Intelligent multi-format household expense tracker with automatic bank statement classification, duplicate detection, and financial analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased overflow-hidden">
        <ThemeProvider>
          <Sidebar />
          <main className="flex-1 h-full overflow-y-auto flex flex-col">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
