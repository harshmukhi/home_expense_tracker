'use client';

import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Sliders,
  DollarSign,
  TrendingDown,
  Layers,
  Wallet,
} from 'lucide-react';
import { formatINR } from '@/lib/currency';
import { MASTER_CATEGORIES } from '@/lib/categorizer';
import { EmptyState } from '@/components/EmptyState';

export default function BudgetsPage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-11');

  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState<any | null>(null);

  useEffect(() => {
    const d = new Date();
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  // Edit / Create Budget Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [cashLimitInput, setCashLimitInput] = useState('');
  const [categoryLimits, setCategoryLimits] = useState<Record<string, string>>({});

  const fetchBudget = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets?month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setBudgetData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
  }, [selectedMonth]);

  const openCreateModal = () => {
    if (budgetData?.hasBudget) {
      setTotalBudgetInput(String(budgetData.budget.totalBudget));
      setCashLimitInput(budgetData.budget.cashLimit ? String(budgetData.budget.cashLimit) : '');
      const existingCats: Record<string, string> = {};
      Object.entries(budgetData.budget.categoryBudgets || {}).forEach(([k, v]) => {
        existingCats[k] = String(v);
      });
      setCategoryLimits(existingCats);
    } else {
      setTotalBudgetInput('');
      setCashLimitInput('');
      setCategoryLimits({});
    }
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const catBudgetsParsed: Record<string, number> = {};
      Object.entries(categoryLimits).forEach(([k, v]) => {
        const parsed = parseFloat(v);
        if (!isNaN(parsed) && parsed > 0) catBudgetsParsed[k] = parsed;
      });

      const payload = {
        month: selectedMonth,
        totalBudget: parseFloat(totalBudgetInput),
        cashLimit: cashLimitInput ? parseFloat(cashLimitInput) : null,
        categoryBudgets: Object.keys(catBudgetsParsed).length > 0 ? catBudgetsParsed : null,
      };

      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchBudget();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const hasBudget = budgetData?.hasBudget;
  const budget = budgetData?.budget;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Household Budget Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set monthly targets, cash thresholds, category limits, and monitor real-time overspending alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-900 dark:text-white"
          />
          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm"
          >
            <Sliders className="w-4 h-4" />
            <span>{hasBudget ? 'Edit Monthly Budget' : 'Set Month Budget'}</span>
          </button>
        </div>
      </div>

      {/* Alerts Banner */}
      {budgetData?.alerts && budgetData.alerts.length > 0 && (
        <div className="space-y-2">
          {budgetData.alerts.map((alert: any, idx: number) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-center space-x-3 text-xs font-medium ${
                alert.type === 'danger'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {!hasBudget && !loading ? (
        <EmptyState
          icon={PiggyBank}
          title={`No Budget Configured for ${selectedMonth}`}
          description="You haven't set a household budget for this month yet. Setting a monthly budget allows you to track utilisation, prevent overspending, and monitor cash limits."
          actionText="Configure Budget Now"
          onAction={openCreateModal}
        />
      ) : (
        <>
          {/* Main Budget Progress Card */}
          <div className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs uppercase font-bold text-gray-400">Monthly Household Budget</span>
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white mt-0.5">
                  {formatINR(budget?.totalBudget)}
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-xs text-gray-400 block">Actual Spent</span>
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {formatINR(budgetData?.actualTotalSpend)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Remaining</span>
                  <span
                    className={`text-lg font-bold ${
                      (budget?.remainingBudget || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                    }`}
                  >
                    {formatINR(budget?.remainingBudget)}
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-gray-500">Utilisation</span>
                <span
                  className={
                    (budget?.utilization || 0) >= 100
                      ? 'text-rose-600 font-bold'
                      : (budget?.utilization || 0) >= 75
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }
                >
                  {budget?.utilization}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (budget?.utilization || 0) >= 100
                      ? 'bg-rose-500'
                      : (budget?.utilization || 0) >= 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, budget?.utilization || 0)}%` }}
                />
              </div>
            </div>

            {/* Cash limit progress if set */}
            {budget?.cashProgress && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <span>
                    Cash Limit: <strong>{formatINR(budget.cashProgress.limit)}</strong> | Spent: {formatINR(budget.cashProgress.spent)}
                  </span>
                </div>
                <span className="font-semibold">{budget.cashProgress.utilization}% spent</span>
              </div>
            )}
          </div>

          {/* Category-Wise Budgets Grid */}
          {budget?.categoryProgress && budget.categoryProgress.length > 0 && (
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>Category Limits Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {budget.categoryProgress.map((cat: any) => (
                  <div
                    key={cat.category}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-900 dark:text-white">{cat.category}</span>
                      <span className="font-mono text-gray-500">
                        {formatINR(cat.spent)} / {formatINR(cat.limit)}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.utilization >= 100
                            ? 'bg-rose-500'
                            : cat.utilization >= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, cat.utilization)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-400">
                      <span>{cat.utilization}% utilised</span>
                      <span className={cat.remaining < 0 ? 'text-rose-500 font-semibold' : ''}>
                        {cat.remaining < 0
                          ? `Exceeded by ${formatINR(Math.abs(cat.remaining))}`
                          : `${formatINR(cat.remaining)} remaining`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Set / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Set Household Budget ({selectedMonth})
            </h3>

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1 font-semibold">
                  Total Monthly Household Budget (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 75000"
                  value={totalBudgetInput}
                  onChange={(e) => setTotalBudgetInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1 font-semibold">
                  Cash Spending Limit (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 15000"
                  value={cashLimitInput}
                  onChange={(e) => setCashLimitInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <label className="block text-gray-600 dark:text-gray-400 font-semibold">
                  Category Limits (Optional)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {MASTER_CATEGORIES.slice(0, 15).map((cat) => (
                    <div key={cat} className="flex items-center justify-between gap-2">
                      <span className="text-gray-700 dark:text-gray-300 truncate w-1/2">{cat}</span>
                      <input
                        type="number"
                        placeholder="Limit (₹)"
                        value={categoryLimits[cat] || ''}
                        onChange={(e) =>
                          setCategoryLimits({ ...categoryLimits, [cat]: e.target.value })
                        }
                        className="w-1/2 p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
