'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  CreditCard,
  QrCode,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Landmark,
  BadgeIndianRupee,
} from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { EmptyState } from '@/components/EmptyState';
import {
  SpendingTrendChart,
  CategoryPieChart,
  BankBarChart,
  PaymentMethodBarChart,
} from '@/components/Charts';
import { formatINR, formatDateIST } from '@/lib/currency';
import { DashboardMetrics } from '@/lib/analytics';

const DATE_FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'prev_month', label: 'Previous Month' },
  { id: 'last_3_months', label: 'Last 3 Months' },
  { id: 'last_6_months', label: 'Last 6 Months' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      let url = `/api/analytics/dashboard?filter=${filter}`;
      if (filter === 'custom' && customStart && customEnd) {
        url += `&customStart=${customStart}&customEnd=${customEnd}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [filter, customStart, customEnd]);

  const isEmpty = !metrics || metrics.totalTransactionsCount === 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header & Date Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Household expenses and financial intelligence overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/import"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Statement</span>
          </Link>
          <Link
            href="/transactions"
            className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Manual</span>
          </Link>
          <button
            onClick={fetchMetrics}
            title="Refresh metrics"
            className="p-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date Filter Pills */}
      <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-1.5 shadow-2xs">
        {DATE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
              filter === f.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {f.label}
          </button>
        ))}

        {filter === 'custom' && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {isEmpty && !loading ? (
        <EmptyState
          title="No Expense Data Yet"
          description="Your database is clean and completely empty. Upload an Excel (.xlsx, .xls, .csv) bank statement or Word (.docx) document to begin automatic tracking and intelligent expense analytics."
          actionText="Upload First Document"
          actionHref="/import"
        />
      ) : (
        <>
          {/* Primary Financial KPIs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Expenses"
              value={formatINR(metrics?.totalMonthlyExpenses)}
              subtitle={`Selected: ${DATE_FILTERS.find((f) => f.id === filter)?.label}`}
              icon={TrendingDown}
              variant="rose"
            />
            <KPICard
              title="Total Income"
              value={formatINR(metrics?.monthlyIncome)}
              subtitle="Salary & other credits"
              icon={TrendingUp}
              variant="emerald"
            />
            <KPICard
              title="Net Savings"
              value={formatINR(metrics?.netSavings)}
              subtitle={
                (metrics?.netSavings ?? 0) >= 0 ? 'Surplus retained' : 'Deficit in period'
              }
              icon={BadgeIndianRupee}
              variant={(metrics?.netSavings ?? 0) >= 0 ? 'emerald' : 'rose'}
            />
            <KPICard
              title="Total Yearly Expenses"
              value={formatINR(metrics?.totalYearlyExpenses)}
              subtitle="Full year to date"
              icon={Calendar}
              variant="blue"
            />
          </div>

          {/* Secondary Payment Segregation KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              title="Today's Spend"
              value={formatINR(metrics?.todayExpenses)}
              icon={Clock}
              variant="slate"
            />
            <KPICard
              title="Avg Daily"
              value={formatINR(metrics?.averageDailySpending)}
              icon={Calendar}
              variant="slate"
            />
            <KPICard
              title="Cash Expenses"
              value={formatINR(metrics?.cashExpenses)}
              icon={Wallet}
              variant="amber"
              onClick={() => router.push('/transactions?paymentMethod=Cash')}
            />
            <KPICard
              title="Cards (Debit+Credit)"
              value={formatINR(metrics?.cardExpenses)}
              subtitle={`Debit: ${formatINR(metrics?.debitCardExpenses)} | CC: ${formatINR(metrics?.creditCardExpenses)}`}
              icon={CreditCard}
              variant="purple"
              onClick={() => router.push('/transactions?paymentMethod=Debit%20Card')}
            />
            <KPICard
              title="UPI Expenses"
              value={formatINR(metrics?.upiExpenses)}
              icon={QrCode}
              variant="blue"
              onClick={() => router.push('/transactions?paymentMethod=UPI')}
            />
            <KPICard
              title="Bank Transfers"
              value={formatINR(metrics?.bankTransferExpenses)}
              icon={Landmark}
              variant="slate"
              onClick={() => router.push('/transactions?paymentMethod=Bank%20Transfer')}
            />
          </div>

          {/* Highest spending category banner if available */}
          {metrics?.highestSpendingCategory && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Highest Spending Category
                  </div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">
                    {metrics.highestSpendingCategory.category} —{' '}
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {formatINR(metrics.highestSpendingCategory.amount)}
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href={`/transactions?category=${encodeURIComponent(metrics.highestSpendingCategory.category)}`}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View Transactions</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Interactive Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending & Income Trend */}
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Spending & Income Trend
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Daily trajectory over selected period
                  </p>
                </div>
              </div>
              <SpendingTrendChart
                data={metrics?.spendingTrend || []}
                onBarClick={(date) => router.push(`/transactions?startDate=${date}&endDate=${date}`)}
              />
            </div>

            {/* Category Breakdown Donut */}
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Category Distribution
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Expenditure split across household categories
                  </p>
                </div>
              </div>
              <CategoryPieChart
                data={metrics?.categoryBreakdown || []}
                onSelectCategory={(cat) => router.push(`/transactions?category=${encodeURIComponent(cat)}`)}
              />
            </div>

            {/* Bank-Wise Spending */}
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Bank-Wise Expenditure
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Spending segregated by bank institution
                  </p>
                </div>
              </div>
              <BankBarChart
                data={metrics?.bankBreakdown || []}
                onSelectBank={(bank) => router.push(`/transactions?bank=${encodeURIComponent(bank)}`)}
              />
            </div>

            {/* Payment Method Distribution */}
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Payment Method Segregation
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cash, Debit Card, Credit Card, UPI, Net Banking
                  </p>
                </div>
              </div>
              <PaymentMethodBarChart
                data={metrics?.paymentMethodBreakdown || []}
                onSelectMethod={(m) => router.push(`/transactions?paymentMethod=${encodeURIComponent(m)}`)}
              />
            </div>
          </div>

          {/* Top 10 Expense Transactions Table */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Top 10 Expense Transactions
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Largest individual expenditures in this timeframe
                </p>
              </div>
              <Link
                href="/transactions"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>All Transactions</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {metrics?.top10Expenses && metrics.top10Expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Payment Method</th>
                      <th className="py-2.5 px-3">Bank</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {metrics.top10Expenses.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-gray-500 dark:text-gray-400">
                          {formatDateIST(t.date)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                          {t.description}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-medium">
                            {t.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                          {t.paymentMethod}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">
                          {t.bank || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-white">
                          {formatINR(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-400">
                No transactions recorded
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
