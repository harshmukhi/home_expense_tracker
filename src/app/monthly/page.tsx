'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
  Building2,
  CreditCard,
  Wallet,
  Sparkles,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { formatINR, formatDateIST, calculatePercentageChange } from '@/lib/currency';
import { EmptyState } from '@/components/EmptyState';
import { CategoryPieChart, BankBarChart, SpendingTrendChart } from '@/components/Charts';

export default function MonthlyAnalysisPage() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(10); // 0-indexed

  // Comparison selector
  const [enableCompare, setEnableCompare] = useState(false);
  const [compareYear, setCompareYear] = useState(2026);
  const [compareMonth, setCompareMonth] = useState(9);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    const d = new Date();
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setCompareYear(d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear());
    setCompareMonth(d.getMonth() === 0 ? 11 : d.getMonth() - 1);
  }, []);

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      let url = `/api/analytics/monthly?year=${selectedYear}&month=${selectedMonth}`;
      if (enableCompare) {
        url += `&compareYear=${compareYear}&compareMonth=${compareMonth}`;
      }
      const res = await fetch(url);
      const resJson = await res.json();
      if (resJson.success) {
        setData(resJson);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedYear, selectedMonth, enableCompare, compareYear, compareMonth]);

  const current = data?.currentMonth;
  const previous = data?.previousMonth;
  const comparison = data?.comparison;
  const observations = data?.observations || [];

  const isEmpty = !current || current.totalTxnCount === 0;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header and Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Monthly Expense Analysis
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Deep financial breakdown, daily patterns, and month-over-month comparisons
          </p>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center space-x-1.5 p-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-transparent text-gray-900 dark:text-white font-medium"
            >
              {monthNames.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-transparent text-gray-900 dark:text-white font-semibold"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setEnableCompare(!enableCompare)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              enableCompare
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Mode</span>
          </button>
        </div>
      </div>

      {/* Compare secondary selector bar */}
      {enableCompare && (
        <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-emerald-800 dark:text-emerald-300">
            Compare Against:
          </span>
          <select
            value={compareMonth}
            onChange={(e) => setCompareMonth(parseInt(e.target.value, 10))}
            className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
          >
            {monthNames.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={compareYear}
            onChange={(e) => setCompareYear(parseInt(e.target.value, 10))}
            className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {isEmpty && !loading ? (
        <EmptyState
          title={`No Transactions for ${monthNames[selectedMonth]} ${selectedYear}`}
          description="There are no household transactions registered for this month. Upload statement or pick another month to view analysis."
          actionText="Import Document"
          actionHref="/import"
        />
      ) : (
        <>
          {/* Monthly High-Level Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-xs uppercase font-medium text-gray-400">Total Monthly Expenses</span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatINR(current?.totalExpenses)}
              </div>
              {comparison && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                  {comparison.expensePctChange.direction === 'increase' ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center">
                      <ArrowUpRight className="w-4 h-4" />
                      +{comparison.expensePctChange.pct}% vs {previous?.label}
                    </span>
                  ) : comparison.expensePctChange.direction === 'decrease' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                      <ArrowDownRight className="w-4 h-4" />
                      -{comparison.expensePctChange.pct}% vs {previous?.label}
                    </span>
                  ) : (
                    <span className="text-gray-400">Equal to {previous?.label}</span>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-xs uppercase font-medium text-gray-400">Total Income</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatINR(current?.totalIncome)}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Net Savings: <strong className="text-gray-900 dark:text-white">{formatINR(current?.netSavings)}</strong>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-xs uppercase font-medium text-gray-400">Average Daily Spend</span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatINR(current?.avgDailySpending)}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Across {new Date(selectedYear, selectedMonth + 1, 0).getDate()} days in month
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-xs uppercase font-medium text-gray-400">Peak Spending Day</span>
              <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {current?.highestSpendingDay ? formatINR(current.highestSpendingDay.amount) : '-'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {current?.highestSpendingDay ? formatDateIST(current.highestSpendingDay.date) : 'No spend recorded'}
              </div>
            </div>
          </div>

          {/* Observations Banner */}
          {observations.length > 0 && (
            <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Intelligent Financial Observations ({current?.label})</span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                {observations.map((obs: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comparison Detailed Breakdown if compare mode is enabled */}
          {enableCompare && comparison && (
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-emerald-500" />
                <span>Category-Wise Month-over-Month Comparison</span>
              </h3>
              <p className="text-xs text-gray-500">
                Comparing <strong>{comparison.monthA.label}</strong> vs <strong>{comparison.monthB.label}</strong>
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">{comparison.monthA.label}</th>
                      <th className="p-3 text-right">{comparison.monthB.label}</th>
                      <th className="p-3 text-right">Difference</th>
                      <th className="p-3 text-right">% Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {comparison.categoryDiffs.map((c: any) => (
                      <tr key={c.category} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="p-3 font-medium text-gray-900 dark:text-white">{c.category}</td>
                        <td className="p-3 text-right font-mono text-gray-500">{formatINR(c.amountA)}</td>
                        <td className="p-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                          {formatINR(c.amountB)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span
                            className={
                              c.diff > 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : c.diff < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-gray-400'
                            }
                          >
                            {c.diff > 0 ? '+' : ''}
                            {formatINR(c.diff)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.pctChange.direction === 'increase'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                                : c.pctChange.direction === 'decrease'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {c.pctChange.direction === 'increase' ? '+' : c.pctChange.direction === 'decrease' ? '-' : ''}
                            {c.pctChange.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cash vs Card Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800">
                  <div className="text-xs text-gray-500">Cash Expenditure Shift</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                    {formatINR(comparison.cashChange.amountB)}
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      (from {formatINR(comparison.cashChange.amountA)})
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800">
                  <div className="text-xs text-gray-500">Card (Debit & Credit) Shift</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                    {formatINR(comparison.cardChange.amountB)}
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      (from {formatINR(comparison.cardChange.amountA)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts for current month */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Category Breakdown ({current?.label})
              </h3>
              <CategoryPieChart data={current?.categoryBreakdown || []} />
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Bank-Wise Expenditure ({current?.label})
              </h3>
              <BankBarChart data={current?.bankBreakdown || []} />
            </div>
          </div>

          {/* Daily spending table */}
          {current?.dailySpending && current.dailySpending.length > 0 && (
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Daily Spending Timeline ({current.label})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {current.dailySpending.map((d: any) => (
                  <div
                    key={d.date}
                    className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-center"
                  >
                    <div className="text-[10px] text-gray-400 font-mono">{d.date.slice(8)}</div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
                      {formatINR(d.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
