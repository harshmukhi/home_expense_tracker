'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Shield,
  Download,
  Upload,
  Trash2,
  Plus,
  RefreshCw,
  Building2,
  CreditCard,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  History,
  CheckCircle2,
  X,
} from 'lucide-react';
import { formatINR, formatDateIST } from '@/lib/currency';

export default function SettingsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals / forms
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newCardBank, setNewCardBank] = useState('');
  const [newCardType, setNewCardType] = useState('CREDIT');
  const [newCardIdentifier, setNewCardIdentifier] = useState('');

  // Confirmation for DB reset
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
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
    fetchSettings();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_category',
          payload: { name: newCategoryName },
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setNewCategoryName('');
        fetchSettings();
      } else {
        alert(resJson.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_bank',
          payload: { name: newBankName },
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setNewBankName('');
        fetchSettings();
      } else {
        alert(resJson.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardBank.trim() || !newCardIdentifier.trim()) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_card',
          payload: {
            bankName: newCardBank,
            cardType: newCardType,
            cardIdentifier: newCardIdentifier,
          },
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setNewCardBank('');
        setNewCardIdentifier('');
        fetchSettings();
      } else {
        alert(resJson.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteBatch = async (batchId: string, fileName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete import batch "${fileName}"? This will delete all transactions imported in this batch.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/settings?action=delete_batch&batchId=${batchId}`, {
        method: 'DELETE',
      });
      const resJson = await res.json();
      if (resJson.success) {
        alert(`Deleted batch and ${resJson.deletedTransactionsCount} transactions.`);
        fetchSettings();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/settings?action=delete_mapping&mappingId=${mappingId}`, {
        method: 'DELETE',
      });
      const resJson = await res.json();
      if (resJson.success) {
        fetchSettings();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleResetDatabase = async () => {
    if (resetConfirmInput !== 'RESET_ALL_DATA') {
      alert('You must type RESET_ALL_DATA exactly to confirm reset.');
      return;
    }
    try {
      const res = await fetch('/api/settings?action=reset_database&confirm=RESET_ALL_DATA', {
        method: 'DELETE',
      });
      const resJson = await res.json();
      if (resJson.success) {
        setIsResetModalOpen(false);
        setResetConfirmInput('');
        alert('Database has been completely reset to empty state.');
        fetchSettings();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!confirm('Restoring will replace current records with the backup file. Proceed?')) return;

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore_backup',
          payload: { backupData },
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        alert('Database restored successfully!');
        fetchSettings();
      } else {
        alert(resJson.error);
      }
    } catch (err: any) {
      alert('Failed to parse backup JSON: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Settings & Data Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          System localization, bank cards, custom categories, import history, and database backups
        </p>
      </div>

      {/* System Defaults Banner */}
      <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-gray-400 block font-medium">Standard Currency</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 block">
            INR (₹) Indian Rupee
          </span>
        </div>
        <div>
          <span className="text-gray-400 block font-medium">Number Formatting</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 block font-mono">
            12,34,567.89 (Indian Grouping)
          </span>
        </div>
        <div>
          <span className="text-gray-400 block font-medium">Default Timezone</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 block font-mono">
            Asia/Kolkata (IST, UTC+5:30)
          </span>
        </div>
      </div>

      {/* Data Backup & Restore */}
      <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Database Backup & Portability
          </h3>
          <p className="text-xs text-gray-500">
            Export a full standalone JSON backup of all tables, or restore an earlier snapshot.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href="/api/settings?action=backup"
            download
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download Database Backup (JSON)</span>
          </a>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleRestoreFile}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300"
          >
            <Upload className="w-4 h-4" />
            <span>Restore from Backup (JSON)</span>
          </button>

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 text-xs font-bold text-rose-700 dark:text-rose-400 ml-auto"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Reset Database...</span>
          </button>
        </div>
      </div>

      {/* Import Batches History */}
      <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Import History & Source Batches
          </h3>
          <p className="text-xs text-gray-500">
            Every uploaded file creates an isolated import batch. You can review or delete individual batches without affecting other data.
          </p>
        </div>

        {data?.importBatches && data.importBatches.length > 0 ? (
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                <tr>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Import Date</th>
                  <th className="p-3">Records</th>
                  <th className="p-3 text-right">Debit (₹)</th>
                  <th className="p-3 text-right">Credit (₹)</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.importBatches.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="p-3 font-semibold text-gray-900 dark:text-white">
                      {b.fileName}
                      <span className="text-[10px] text-gray-400 block font-normal font-mono">
                        ID: {b.id}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {formatDateIST(b.importedAt)}
                    </td>
                    <td className="p-3 font-bold">{b.totalRecords}</td>
                    <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                      {formatINR(b.totalDebit)}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatINR(b.totalCredit)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteBatch(b.id, b.fileName)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        title="Delete batch and its transactions"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            No files imported yet.
          </div>
        )}
      </div>

      {/* Saved Column Mapping Templates */}
      {data?.columnMappings && data.columnMappings.length > 0 && (
        <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Saved Excel Mapping Templates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.columnMappings.map((m: any) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-gray-900 dark:text-white">{m.name}</div>
                  <div className="text-[10px] text-gray-400">Header row: {m.headerRowIndex + 1}</div>
                </div>
                <button
                  onClick={() => handleDeleteMapping(m.id)}
                  className="p-1 rounded text-rose-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Master Management: Categories, Banks, and Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Custom Categories */}
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>Add Custom Category</span>
          </h4>
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Solar Energy, Pets"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
            >
              Add
            </button>
          </form>
          <div className="text-[11px] text-gray-400">
            Total active categories: {data?.categories?.length || 0}
          </div>
        </div>

        {/* Banks */}
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <span>Add Bank Name</span>
          </h4>
          <form onSubmit={handleCreateBank} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Canara Bank"
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
            >
              Add
            </button>
          </form>
          <div className="text-[11px] text-gray-400">
            Configured banks: {data?.banks?.length || 0}
          </div>
        </div>

        {/* Cards */}
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>Register Card</span>
          </h4>
          <form onSubmit={handleCreateCard} className="space-y-2 text-xs">
            <input
              type="text"
              placeholder="Bank (e.g. HDFC)"
              value={newCardBank}
              onChange={(e) => setNewCardBank(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <div className="flex gap-2">
              <select
                value={newCardType}
                onChange={(e) => setNewCardType(e.target.value)}
                className="w-1/2 p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="CREDIT">Credit Card</option>
                <option value="DEBIT">Debit Card</option>
              </select>
              <input
                type="text"
                placeholder="Name / Last 4"
                value={newCardIdentifier}
                onChange={(e) => setNewCardIdentifier(e.target.value)}
                className="w-1/2 p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
            >
              Register Card
            </button>
          </form>
        </div>
      </div>

      {/* Audit Log */}
      <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-500" />
          <span>System Audit Trail</span>
        </h3>
        <p className="text-xs text-gray-500">
          Immutable log of imports, updates, deletions, and administrative actions
        </p>

        {data?.auditLogs && data.auditLogs.length > 0 ? (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {data.auditLogs.map((log: any) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white font-mono">
                    [{log.action}]
                  </span>{' '}
                  <span className="text-gray-600 dark:text-gray-300">{log.details}</span>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap ml-4">
                  {formatDateIST(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400">No audit entries logged yet.</div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-rose-300 dark:border-rose-900 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Confirm Database Reset</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              This action will permanently wipe all transactions, budgets, recurring expenses, and imported statement files.
              To proceed, please type <strong className="font-mono text-rose-600">RESET_ALL_DATA</strong> below:
            </p>

            <input
              type="text"
              placeholder="Type RESET_ALL_DATA"
              value={resetConfirmInput}
              onChange={(e) => setResetConfirmInput(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-gray-800 text-xs font-mono text-gray-900 dark:text-white"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetConfirmInput('');
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={resetConfirmInput !== 'RESET_ALL_DATA'}
                onClick={handleResetDatabase}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl disabled:opacity-40"
              >
                Permanently Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
