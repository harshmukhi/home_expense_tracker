'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Calendar,
  TrendingDown,
  TrendingUp,
  Award,
  Layers,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { formatINR } from '@/lib/currency';
import { EmptyState } from '@/components/EmptyState';
import { CategoryPieChart, BankBarChart } from '@/components/Charts';

export default function AnalyticsPage() {
  const [year, setYear] = useState(2026);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const fetchYearlyData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/yearly?year=${year}`);
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
    fetchYearlyData();
  }, [year]);

  const isEmpty = !data || (data.totalYearlyExpenses === 0 && data.totalYearlyIncome === 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header and Year Picker */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Yearly Financial Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Annual trajectory, month-by-month distribution, and year-over-year performance
          </p>
        </div>

        <div className="flex items-center space-x-2 p-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {[2024, 2025, 2026, 2027].map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                year === y
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {isEmpty && !loading ? (
        <EmptyState
          title={`No Records for Year ${year}`}
          description={`Your database has no recorded transactions in the calendar year ${year}. Upload statement files to generate full annual intelligence.`}
          actionText="Import Document"
          actionHref="/import"
        />
      ) : (
        <>
          {/* Yearly Primary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-xs uppercase font-medium text-gray-400">Total Yearly Expenses</span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatINR(data?.totalYearlyExpenses)}
              </div>
              {data?.prevYear && (
                <div className="mt-2 text-xs flex items-center gap-1 font-semibold">
                  {data.prevYear.expenseChange.direction === 'increase' ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center">
                      <ArrowUpRight className="w-4 h-4" />
                      +{data.prevYear.expenseChange.pct}% YoY
                    </span>
                  ) : data.prevYear.expenseChange.direction === 'decrease' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                      <ArrowDownRight className="w-4 h-4" />
                      -{data.prevYear.expenseChange.pct}% YoY
                    </span>
                  ) : (
                    <span className="text-gray-400">0% YoY change</span>
                  )}
                  <span className="text-gray-400 font-normal">vs {data.prevYear.year}</span>
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-xs uppercase font-medium text-gray-400">Total Yearly Income</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatINR(data?.totalYearlyIncome)}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Annual net savings: <strong className="text-gray-900 dark:text-white">{formatINR(data?.yearlySavings)}</strong>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-xs uppercase font-medium text-gray-400">Monthly Average Spend</span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatINR(data?.monthlyAverage)}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Mean across active months
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-xs uppercase font-medium text-gray-400">Highest Spending Month</span>
              <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {data?.highestMonth ? `${data.highestMonth.monthName} — ${formatINR(data.highestMonth.expenses)}` : '-'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Lowest: {data?.lowestMonth ? `${data.lowestMonth.monthName} (${formatINR(data.lowestMonth.expenses)})` : '-'}
              </div>
            </div>
          </div>

          {/* 12-Month Expense vs Income Bar Chart */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
              Monthly Expense vs Income ({year})
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Side-by-side annual comparison across all 12 calendar months
            </p>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.monthlyBreakdown || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderColor: '#374151',
                      borderRadius: '0.75rem',
                      color: '#f9fafb',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => formatINR(Number(val) || 0)}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Yearly Category & Bank Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Full-Year Category Distribution ({year})
              </h3>
              <CategoryPieChart data={data?.categoryBreakdown || []} />
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Full-Year Bank-Wise Expenditure ({year})
              </h3>
              <BankBarChart data={data?.bankBreakdown || []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
