'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  Calendar,
  Layers,
  ArrowUpDown,
  CreditCard,
  Building2,
  FileSpreadsheet,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { formatINR, formatDateIST } from '@/lib/currency';
import { MASTER_CATEGORIES, PAYMENT_METHODS } from '@/lib/categorizer';
import { EmptyState } from '@/components/EmptyState';

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL');
  const [paymentMethod, setPaymentMethod] = useState(searchParams.get('paymentMethod') || 'ALL');
  const [bank, setBank] = useState(searchParams.get('bank') || 'ALL');
  const [type, setType] = useState(searchParams.get('type') || 'ALL');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Multi-selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    date: '2026-11-02',
    description: '',
    amount: '',
    type: 'EXPENSE',
    category: 'Groceries',
    paymentMethod: 'UPI',
    bank: '',
    cardOrAccount: '',
    referenceNumber: '',
    notes: '',
  });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setFormData((prev) => ({ ...prev, date: today }));
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category && category !== 'ALL') params.append('category', category);
      if (paymentMethod && paymentMethod !== 'ALL') params.append('paymentMethod', paymentMethod);
      if (bank && bank !== 'ALL') params.append('bank', bank);
      if (type && type !== 'ALL') params.append('type', type);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', String(page));
      params.append('limit', '50');
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [category, paymentMethod, bank, type, startDate, endDate, page, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length && transactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setFormData({
          date: new Date().toISOString().slice(0, 10),
          description: '',
          amount: '',
          type: 'EXPENSE',
          category: 'Groceries',
          paymentMethod: 'UPI',
          bank: '',
          cardOrAccount: '',
          referenceNumber: '',
          notes: '',
        });
        fetchTransactions();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTransaction.id,
          updates: {
            date: formData.date,
            description: formData.description,
            amount: formData.amount,
            type: formData.type,
            category: formData.category,
            paymentMethod: formData.paymentMethod,
            bank: formData.bank || null,
            cardOrAccount: formData.cardOrAccount || null,
            referenceNumber: formData.referenceNumber || null,
            notes: formData.notes || null,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingTransaction(null);
        fetchTransactions();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchTransactions();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} transactions?`)) return;
    try {
      const ids = Array.from(selectedIds).join(',');
      const res = await fetch(`/api/transactions?idsParam=${ids}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSelectedIds(new Set());
        fetchTransactions();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBulkCategorySubmit = async () => {
    if (selectedIds.size === 0 || !bulkCategory) return;
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          updates: { category: bulkCategory },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsBulkCategoryModalOpen(false);
        setSelectedIds(new Set());
        fetchTransactions();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openEditModal = (t: any) => {
    setEditingTransaction(t);
    setFormData({
      date: new Date(t.date).toISOString().slice(0, 10),
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      category: t.category,
      paymentMethod: t.paymentMethod,
      bank: t.bank || '',
      cardOrAccount: t.cardOrAccount || '',
      referenceNumber: t.referenceNumber || '',
      notes: t.notes || '',
    });
  };

  const exportUrl = (format: 'xlsx' | 'csv') => {
    const params = new URLSearchParams();
    params.append('format', format);
    if (category && category !== 'ALL') params.append('category', category);
    if (paymentMethod && paymentMethod !== 'ALL') params.append('paymentMethod', paymentMethod);
    if (bank && bank !== 'ALL') params.append('bank', bank);
    if (type && type !== 'ALL') params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return `/api/export?${params.toString()}`;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header and top actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Transaction Ledger
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Complete searchable record of household expenses, income, and bank transfers ({total} total)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href={exportUrl('xlsx')}
            download
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </a>
          <a
            href={exportUrl('csv')}
            download
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </a>
          <button
            onClick={() => {
              setFormData({
                date: new Date().toISOString().slice(0, 10),
                description: '',
                amount: '',
                type: 'EXPENSE',
                category: 'Groceries',
                paymentMethod: 'UPI',
                bank: '',
                cardOrAccount: '',
                referenceNumber: '',
                notes: '',
              });
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, reference no, bank, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 hover:bg-black dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-xs font-semibold"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-xs">
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="ALL">All Categories</option>
              {MASTER_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="ALL">All Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="ALL">All Types</option>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Sort Order</label>
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('_');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="date_desc">Date (Newest first)</option>
              <option value="date_asc">Date (Oldest first)</option>
              <option value="amount_desc">Amount (Highest first)</option>
              <option value="amount_asc">Amount (Lowest first)</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.size > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {selectedIds.size} transactions selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBulkCategoryModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-100"
              >
                Bulk Categorize
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold hover:bg-rose-100"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table or Empty State */}
      {transactions.length === 0 && !loading ? (
        <EmptyState
          title="No Transactions Found"
          description={
            total === 0 && !search && category === 'ALL'
              ? 'Your transaction database is currently empty. Import a statement or add transactions manually.'
              : 'No transactions match the selected filters or search keyword.'
          }
          actionText="Import Document"
          actionHref="/import"
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === transactions.length && transactions.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Bank / Account</th>
                  <th className="p-3">Reference No</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${
                      selectedIds.has(t.id) ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelectId(t.id)}
                      />
                    </td>
                    <td className="p-3 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDateIST(t.date)}
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="font-medium text-gray-900 dark:text-white truncate" title={t.description}>
                        {t.description}
                      </div>
                      {t.sourceFile && (
                        <div className="text-[10px] text-gray-400 truncate">
                          Source: {t.sourceFile}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-medium whitespace-nowrap">
                        {t.category}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {t.paymentMethod}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {t.bank || '-'}
                      {t.cardOrAccount && <span className="block text-[10px]">{t.cardOrAccount}</span>}
                    </td>
                    <td className="p-3 font-mono text-gray-400 text-[11px] whitespace-nowrap">
                      {t.referenceNumber || '-'}
                    </td>
                    <td className="p-3 text-right font-bold whitespace-nowrap">
                      <span
                        className={
                          t.type === 'INCOME'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : t.type === 'TRANSFER'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-900 dark:text-white'
                        }
                      >
                        {t.type === 'INCOME' ? '+' : ''}
                        {formatINR(t.amount)}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => openEditModal(t)}
                          title="Edit transaction"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          title="Delete transaction"
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      {(isAddModalOpen || editingTransaction) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingTransaction ? 'Edit Transaction' : 'Add Manual Transaction'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingTransaction(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingTransaction ? handleEditSubmit : handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">Description / Merchant *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy order, BESCOM electricity bill, D-Mart"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </div>
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
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, SBI"
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Reference Number / UTR</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/1234567890"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or bill memo..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingTransaction(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {editingTransaction ? 'Save Changes' : 'Create Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Category Modal */}
      {isBulkCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Bulk Categorize ({selectedIds.size} transactions)
            </h3>
            <p className="text-xs text-gray-500">
              Select the new category to apply to all selected transactions:
            </p>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
            >
              <option value="">Select category...</option>
              {MASTER_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBulkCategoryModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!bulkCategory}
                onClick={handleBulkCategorySubmit}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
              >
                Apply Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading ledger...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
