'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  CalendarDays,
  MoreHorizontal,
  LineChart,
  PiggyBank,
  RefreshCw,
  FileText,
  Settings,
  Sun,
  Moon,
  X,
  Plus,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function MobileNavBar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const MORE_ITEMS = [
    { name: 'Analytics', href: '/analytics', icon: LineChart, desc: 'Yearly trends & annual overview' },
    { name: 'Budgets', href: '/budgets', icon: PiggyBank, desc: 'Monthly limits & overspending alerts' },
    { name: 'Recurring Bills', href: '/recurring', icon: RefreshCw, desc: 'Track utilities, rent & EMIs' },
    { name: 'Month-End Reports', href: '/reports', icon: FileText, desc: 'Formal closure & PDF export' },
    { name: 'Settings & Backup', href: '/settings', icon: Settings, desc: 'Categories, banks & DB restore' },
  ];

  return (
    <>
      {/* Sleek Native Mobile Bottom App Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-2 py-1.5 flex items-center justify-around shadow-lg pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {/* 1. Dashboard */}
        <Link
          href="/"
          onClick={() => setIsMoreOpen(false)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            pathname === '/'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-1">Home</span>
        </Link>

        {/* 2. Transactions */}
        <Link
          href="/transactions"
          onClick={() => setIsMoreOpen(false)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            pathname.startsWith('/transactions')
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] mt-1">Ledger</span>
        </Link>

        {/* 3. Center Highlighted Import Button */}
        <Link
          href="/import"
          onClick={() => setIsMoreOpen(false)}
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
            Import
          </span>
        </Link>

        {/* 4. Monthly */}
        <Link
          href="/monthly"
          onClick={() => setIsMoreOpen(false)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            pathname.startsWith('/monthly')
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] mt-1">Monthly</span>
        </Link>

        {/* 5. More Menu */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            isMoreOpen ||
            ['/analytics', '/budgets', '/recurring', '/reports', '/settings'].some((p) =>
              pathname.startsWith(p)
            )
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-1">More</span>
        </button>
      </nav>

      {/* Mobile Bottom Sheet Drawer for "More" */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl border-t border-gray-200 dark:border-gray-800 p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between pt-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                More Features
              </h3>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* More navigation grid */}
            <div className="space-y-2">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex items-center space-x-3.5 p-3 rounded-2xl transition-colors ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800/60'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{item.name}</div>
                      <div className="text-[11px] text-gray-400">{item.desc}</div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Quick Dark Mode toggle in drawer */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-emerald-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>Theme</span>
              </span>
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

