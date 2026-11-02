'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  Calendar,
  Building2,
  CreditCard,
  Wallet,
  QrCode,
  ArrowUpRight,
  ArrowDownRight,
  BadgeIndianRupee,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { formatINR, formatDateIST } from '@/lib/currency';
import { EmptyState } from '@/components/EmptyState';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(10);

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = new Date();
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/monthly?year=${selectedYear}&month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedYear, selectedMonth]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const current = reportData?.currentMonth;
  const previous = reportData?.previousMonth;
  const comparison = reportData?.comparison;
  const observations = reportData?.observations || [];

  const isEmpty = !current || current.totalTxnCount === 0;

  // Export as formatted Excel
  const exportExcelReport = () => {
    if (!current) return;
    const wb = XLSX.utils.book_new();

    // 1. Executive Summary Sheet
    const summaryRows = [
      ['SMART HOME EXPENSE TRACKER - MONTH-END FINANCIAL REPORT'],
      ['Month:', current.label],
      ['Generated At:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
      [],
      ['PRIMARY FINANCIAL METRICS'],
      ['Total Household Expenses:', current.totalExpenses],
      ['Total Monthly Income:', current.totalIncome],
      ['Net Savings:', current.netSavings],
      ['Average Daily Spending:', current.avgDailySpending],
      [],
      ['PAYMENT METHOD SEGREGATION'],
      ...current.paymentMethodBreakdown.map((m: any) => [m.method, m.amount, `${m.percentage}%`]),
      [],
      ['EXECUTIVE OBSERVATIONS'],
      ...observations.map((obs: string) => [obs]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // 2. Category Breakdown Sheet
    const categoryRows = [
      ['Category', 'Amount (INR)', 'Percentage (%)'],
      ...current.categoryBreakdown.map((c: any) => [c.category, c.amount, c.percentage]),
    ];
    const wsCategory = XLSX.utils.aoa_to_sheet(categoryRows);
    XLSX.utils.book_append_sheet(wb, wsCategory, 'Categories');

    // 3. Bank-wise Breakdown Sheet
    const bankRows = [
      ['Bank / Account', 'Amount (INR)', 'Percentage (%)'],
      ...current.bankBreakdown.map((b: any) => [b.bank, b.amount, b.percentage]),
    ];
    const wsBank = XLSX.utils.aoa_to_sheet(bankRows);
    XLSX.utils.book_append_sheet(wb, wsBank, 'Banks');

    // 4. Top 10 Expenses Sheet
    const top10Rows = [
      ['Date', 'Description', 'Category', 'Payment Method', 'Bank', 'Amount (INR)'],
      ...current.top10.map((t: any) => [
        t.date ? String(t.date).slice(0, 10) : '',
        t.description,
        t.category,
        t.paymentMethod,
        t.bank || '',
        t.amount,
      ]),
    ];
    const wsTop10 = XLSX.utils.aoa_to_sheet(top10Rows);
    XLSX.utils.book_append_sheet(wb, wsTop10, 'Top 10 Expenses');

    XLSX.writeFile(wb, `Month-End-Report-${current.monthStr}.xlsx`);
  };

  // Export as CSV
  const exportCsvReport = () => {
    if (!current) return;
    const rows = [
      ['Category', 'Amount', 'Percentage'],
      ...current.categoryBreakdown.map((c: any) => [c.category, c.amount, `${c.percentage}%`]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Month-End-Report-${current.monthStr}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Top Header & Historical Month Regenerator */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Month-End Financial Report
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Formal household monthly closure report with observations, payment audits, and comparisons
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
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
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={exportExcelReport}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={exportCsvReport}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {isEmpty && !loading ? (
        <EmptyState
          icon={FileText}
          title={`No Financial Activity for ${monthNames[selectedMonth]} ${selectedYear}`}
          description="A month-end report can only be generated from real transaction records. Upload statement files to produce audit reports."
          actionText="Import Document"
          actionHref="/import"
        />
      ) : (
        /* Printable Report Container */
        <div
          ref={reportRef}
          className="p-8 md:p-12 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-8 shadow-sm print:border-none print:shadow-none print:p-0"
        >
          {/* Formal Report Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                MONTH-END FINANCIAL REPORT
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
                {current?.label}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Generated from verified bank statement entries & document records
              </p>
            </div>
            <div className="text-right text-xs text-gray-400 font-mono">
              <div>Currency: INR (₹)</div>
              <div>Report Date: {new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            </div>
          </div>

          {/* Primary Statement KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">1. Total Expenses</span>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                {formatINR(current?.totalExpenses)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">2. Total Income</span>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatINR(current?.totalIncome)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">3. Net Savings</span>
              <div
                className={`text-2xl font-extrabold mt-1 ${
                  (current?.netSavings || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                {formatINR(current?.netSavings)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">4. Daily Average</span>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                {formatINR(current?.avgDailySpending)}
              </div>
            </div>
          </div>

          {/* Intelligent Written Observations */}
          <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Intelligent Spending Summary (Calculated from Real Transactions)</span>
            </div>
            <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {observations.map((obs: string, idx: number) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment Method & Bank Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Method Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>Payment Method Breakdown</span>
              </h4>
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                    <tr>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {current?.paymentMethodBreakdown.map((m: any) => (
                      <tr key={m.method}>
                        <td className="p-2.5 font-medium">{m.method}</td>
                        <td className="p-2.5 text-right font-mono font-semibold">{formatINR(m.amount)}</td>
                        <td className="p-2.5 text-right text-gray-500">{m.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bank Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <span>Bank-Wise Expenditure</span>
              </h4>
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                    <tr>
                      <th className="p-2.5">Bank</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {current?.bankBreakdown.map((b: any) => (
                      <tr key={b.bank}>
                        <td className="p-2.5 font-medium">{b.bank}</td>
                        <td className="p-2.5 text-right font-mono font-semibold">{formatINR(b.amount)}</td>
                        <td className="p-2.5 text-right text-gray-500">{b.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Category-Wise Expense Distribution */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Category-Wise Spending Ledger</span>
            </h4>
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-semibold">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3 text-right">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {current?.categoryBreakdown.map((c: any) => (
                    <tr key={c.category} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="p-3 font-medium text-gray-900 dark:text-white">{c.category}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatINR(c.amount)}</td>
                      <td className="p-3 text-right text-gray-500">{c.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top 10 Expenses */}
          {current?.top10 && current.top10.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Top 10 Individual Expenditures
              </h4>
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-semibold">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {current.top10.map((t: any) => (
                      <tr key={t.id}>
                        <td className="p-2.5 font-mono text-gray-500 whitespace-nowrap">
                          {formatDateIST(t.date)}
                        </td>
                        <td className="p-2.5 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                          {t.description}
                        </td>
                        <td className="p-2.5">{t.category}</td>
                        <td className="p-2.5 text-gray-500">{t.paymentMethod}</td>
                        <td className="p-2.5 text-right font-bold text-gray-900 dark:text-white">
                          {formatINR(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Report Footer */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <span>Smart Home Expense Tracker</span>
            <span>Financial Integrity & Accuracy Guaranteed</span>
          </div>
        </div>
      )}
    </div>
  );
}
