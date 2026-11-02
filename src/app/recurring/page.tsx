'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
  CreditCard,
  X,
} from 'lucide-react';
import { formatINR, formatDateIST } from '@/lib/currency';
import { MASTER_CATEGORIES, PAYMENT_METHODS } from '@/lib/categorizer';
import { EmptyState } from '@/components/EmptyState';

export default function RecurringExpensesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    expectedAmount: '',
    frequency: 'MONTHLY',
    category: 'Electricity',
    paymentMethod: 'UPI',
    bank: '',
    lastPaymentDate: '',
    nextExpectedDate: '',
  });

  const fetchRecurring = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recurring');
      const data = await res.json();
      if (data.success) {
        setItems(data.recurringExpenses || []);
        setSuggestions(data.suggestions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/recurring';
      const method = editingItem ? 'PUT' : 'POST';
      const payload = editingItem
        ? { id: editingItem.id, updates: formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setEditingItem(null);
        fetchRecurring();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring expense?')) return;
    try {
      const res = await fetch(`/api/recurring?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchRecurring();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const acceptSuggestion = async (sugg: any) => {
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sugg),
      });
      const data = await res.json();
      if (data.success) {
        fetchRecurring();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      expectedAmount: '',
      frequency: 'MONTHLY',
      category: 'Electricity',
      paymentMethod: 'UPI',
      bank: '',
      lastPaymentDate: '',
      nextExpectedDate: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      expectedAmount: String(item.expectedAmount),
      frequency: item.frequency,
      category: item.category,
      paymentMethod: item.paymentMethod || 'UPI',
      bank: item.bank || '',
      lastPaymentDate: item.lastPaymentDate ? new Date(item.lastPaymentDate).toISOString().slice(0, 10) : '',
      nextExpectedDate: item.nextExpectedDate ? new Date(item.nextExpectedDate).toISOString().slice(0, 10) : '',
    });
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Recurring Expenses & Bills
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track fixed monthly utility bills, rent, internet, EMIs, insurance, and subscriptions
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Recurring Bill</span>
        </button>
      </div>

      {/* Intelligent Suggestions Banner */}
      {suggestions.length > 0 && (
        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Intelligent Repeat Expense Suggestions ({suggestions.length} detected)</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            The system analyzed your past 90 days transaction records and discovered recurring monthly charges:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-gray-900 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-gray-900 dark:text-white truncate max-w-xs">
                    {s.name}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {s.category} • {formatINR(s.expectedAmount)} • {s.occurrenceCount} repeat debits
                  </div>
                </div>
                <button
                  onClick={() => acceptSuggestion(s)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  Track Bill
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main List */}
      {items.length === 0 && !loading ? (
        <EmptyState
          icon={RefreshCw}
          title="No Recurring Bills Tracked"
          description="Track your monthly utilities, rent, wifi, streaming subscriptions, and EMIs with due dates and expected amounts."
          actionText="Add First Recurring Bill"
          onAction={openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3 shadow-2xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    {item.category}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1.5 truncate max-w-[200px]">
                    {item.name}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-gray-900 dark:text-white">
                    {formatINR(item.expectedAmount)}
                  </div>
                  <span className="text-[10px] text-gray-400 lowercase">{item.frequency}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
                {item.bank && (
                  <div className="flex items-center justify-between">
                    <span>Bank:</span>
                    <strong className="text-gray-700 dark:text-gray-300">{item.bank}</strong>
                  </div>
                )}
                {item.paymentMethod && (
                  <div className="flex items-center justify-between">
                    <span>Payment Mode:</span>
                    <strong className="text-gray-700 dark:text-gray-300">{item.paymentMethod}</strong>
                  </div>
                )}
                {item.nextExpectedDate && (
                  <div className="flex items-center justify-between">
                    <span>Next Expected Date:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {formatDateIST(item.nextExpectedDate)}
                    </strong>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => openEditModal(item)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Recurring Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingItem ? 'Edit Recurring Bill' : 'Track Recurring Bill'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">Bill Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BESCOM Electricity, JioFiber, House Rent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Expected Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.expectedAmount}
                    onChange={(e) => setFormData({ ...formData, expectedAmount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {MASTER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Bank (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Next Expected Date</label>
                  <input
                    type="date"
                    value={formData.nextExpectedDate}
                    onChange={(e) => setFormData({ ...formData, nextExpectedDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
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
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
