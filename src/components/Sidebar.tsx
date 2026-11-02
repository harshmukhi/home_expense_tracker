'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  CalendarDays,
  LineChart,
  PiggyBank,
  RefreshCw,
  FileText,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  { name: 'Import Expenses', href: '/import', icon: FileSpreadsheet },
  { name: 'Monthly Analysis', href: '/monthly', icon: CalendarDays },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Budgets', href: '/budgets', icon: PiggyBank },
  { name: 'Recurring Expenses', href: '/recurring', icon: RefreshCw },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar toggle */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            ₹
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">Smart Expense</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:relative'
        }`}
      >
        {/* Logo and Brand */}
        <div className="p-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/60">
          <Link href="/" className="flex items-center space-x-3" onClick={() => setIsOpen(false)}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-500/20">
              ₹
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                Smart Home
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium tracking-wide">
                EXPENSE TRACKER
              </div>
            </div>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/70 dark:hover:bg-gray-800/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom controls: Currency indicator and Theme toggle */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              INR (₹) Asia/Kolkata
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-between"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-emerald-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800">
                Toggle
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

