'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Settings,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Info,
} from 'lucide-react';
import { formatINR, formatDateIST } from '@/lib/currency';
import { ColumnMappingConfig, ParsedTransactionPreview } from '@/lib/importers/excelParser';
import { MASTER_CATEGORIES, PAYMENT_METHODS } from '@/lib/categorizer';

interface ImportSummary {
  totalDetected: number;
  validCount: number;
  invalidCount: number;
  exactDuplicatesCount: number;
  potentialDuplicatesCount: number;
  newRecordsCount: number;
  totalDebit: number;
  totalCredit: number;
  detectedBanks: string[];
  detectedMethods: string[];
}

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow step: 1 = upload, 2 = column mapping (for Excel), 3 = review preview, 4 = imported success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Analysis result for Excel
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingConfig>({});
  const [savedMappings, setSavedMappings] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState<string>('');
  const [rawSampleRows, setRawSampleRows] = useState<any[][]>([]);

  // Preview items & summary
  const [previewRecords, setPreviewRecords] = useState<ParsedTransactionPreview[]>([]);
  const [excludedTempIds, setExcludedTempIds] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  // Success state
  const [importResult, setImportResult] = useState<any>(null);

  // Handle file drop / select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze file');
      }

      if (data.fileType === 'DOCX') {
        // Direct Word parser review step
        const items: ParsedTransactionPreview[] = data.duplicateAnalysis.items;
        setPreviewRecords(items);

        let totalDebit = 0;
        let totalCredit = 0;
        const banks = new Set<string>();
        const methods = new Set<string>();

        items.forEach((it) => {
          if (it.type === 'EXPENSE') totalDebit += it.amount;
          if (it.type === 'INCOME') totalCredit += it.amount;
          if (it.bank) banks.add(it.bank);
          if (it.paymentMethod) methods.add(it.paymentMethod);
        });

        setSummary({
          totalDetected: data.duplicateAnalysis.totalIncoming,
          validCount: items.filter((i) => i.isValid).length,
          invalidCount: items.filter((i) => !i.isValid).length,
          exactDuplicatesCount: data.duplicateAnalysis.exactDuplicatesCount,
          potentialDuplicatesCount: data.duplicateAnalysis.potentialDuplicatesCount,
          newRecordsCount: data.duplicateAnalysis.newRecordsCount,
          totalDebit,
          totalCredit,
          detectedBanks: Array.from(banks),
          detectedMethods: Array.from(methods),
        });

        // Pre-exclude exact duplicates by default to prevent accidents, but user can un-exclude
        const dups = new Set<string>();
        items.forEach((it) => {
          if (it.isDuplicate) dups.add(it.tempId);
        });
        setExcludedTempIds(dups);

        setStep(3); // Jump straight to review
      } else {
        // Excel structure
        const analysis = data.analysis;
        setSheetNames(analysis.sheetNames || []);
        setActiveSheet(analysis.activeSheet || '');
        setHeaderRowIndex(analysis.headerRowIndex || 0);
        setAvailableColumns(analysis.availableColumns || []);
        setColumnMapping(analysis.suggestedMapping || {});
        setSavedMappings(data.savedMappings || []);
        setRawSampleRows(analysis.rawSampleRows || []);

        setStep(2); // Go to column mapping verification
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  // Switch sheet
  const handleSheetChange = async (sheet: string) => {
    if (!selectedFile) return;
    setActiveSheet(sheet);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sheet', sheet);

      const res = await fetch('/api/import/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setHeaderRowIndex(data.analysis.headerRowIndex);
        setAvailableColumns(data.analysis.availableColumns);
        setColumnMapping(data.analysis.suggestedMapping);
        setRawSampleRows(data.analysis.rawSampleRows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  // Generate preview from Excel mapping
  const generatePreview = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sheet', activeSheet);
      formData.append('headerRowIndex', String(headerRowIndex));
      formData.append('mapping', JSON.stringify(columnMapping));

      const res = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      setSummary(data.summary);
      setPreviewRecords(data.duplicateAnalysis.items);

      // Pre-exclude exact duplicates
      const dups = new Set<string>();
      data.duplicateAnalysis.items.forEach((it: ParsedTransactionPreview) => {
        if (it.isDuplicate) dups.add(it.tempId);
      });
      setExcludedTempIds(dups);

      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error generating preview');
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle exclusion of a transaction row
  const toggleExclude = (tempId: string) => {
    setExcludedTempIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId);
      else next.add(tempId);
      return next;
    });
  };

  // Edit preview record inline
  const updatePreviewRecord = (tempId: string, updates: Partial<ParsedTransactionPreview>) => {
    setPreviewRecords((prev) =>
      prev.map((r) => {
        if (r.tempId === tempId) {
          return { ...r, ...updates };
        }
        return r;
      })
    );
  };

  // Final confirmation to commit records to database
  const confirmImport = async () => {
    const includedRecords = previewRecords.filter((r) => !excludedTempIds.has(r.tempId));
    if (includedRecords.length === 0) {
      setErrorMessage('No transactions selected for import');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const payload = {
        fileName: selectedFile?.name || 'Uploaded File',
        fileType: selectedFile?.name.split('.').pop()?.toUpperCase() || 'XLSX',
        records: includedRecords,
        saveMappingAs: templateName.trim() || undefined,
        mappingConfig: columnMapping,
        headerRowIndex,
        sheetName: activeSheet,
      };

      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data);
      setStep(4);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving transactions');
    } finally {
      setIsUploading(false);
    }
  };

  const applySavedMapping = (mappingObj: any) => {
    try {
      const parsed = JSON.parse(mappingObj.mappings);
      setColumnMapping(parsed);
      setHeaderRowIndex(mappingObj.headerRowIndex || 0);
      if (mappingObj.sheetName && sheetNames.includes(mappingObj.sheetName)) {
        setActiveSheet(mappingObj.sheetName);
      }
    } catch (e) {
      console.error('Failed to parse saved mapping', e);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Intelligent Document Importer
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload any bank statement or household expense sheet in Excel (.xlsx, .xls, .csv) or Word (.docx).
        </p>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
        {[
          { num: 1, label: 'Upload Document' },
          { num: 2, label: 'Structure & Mapping' },
          { num: 3, label: 'Review & Verify' },
          { num: 4, label: 'Completed' },
        ].map((s) => (
          <div key={s.num} className="flex items-center space-x-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s.num
                  ? 'bg-emerald-600 text-white'
                  : step > s.num
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                step === s.num ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: UPLOAD AREA */}
      {step === 1 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-3xl p-12 text-center cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-gray-900/60 transition-all group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv,.docx"
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {isUploading ? 'Analyzing file structure...' : 'Choose or drop your expense document'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2">
            Supports Excel spreadsheets (<strong>.xlsx, .xls, .csv</strong>) and Word documents (<strong>.docx</strong>).
            The intelligent parser automatically adapts to varying column names, layouts, and bank statement styles.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel / CSV</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              <span>Word (.docx)</span>
            </span>
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING & STRUCTURE (FOR EXCEL) */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Detected Document Structure</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  File: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedFile?.name}</span>
                </p>
              </div>

              {savedMappings.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Saved Template:</span>
                  <select
                    onChange={(e) => {
                      const m = savedMappings.find((x) => x.name === e.target.value);
                      if (m) applySavedMapping(m);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select template...</option>
                    {savedMappings.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Sheet Selection & Header Row Index */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
              {sheetNames.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Active Sheet ({sheetNames.length} available)
                  </label>
                  <select
                    value={activeSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Header Row Number (1-based index)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={headerRowIndex + 1}
                  onChange={(e) => setHeaderRowIndex(Math.max(0, parseInt(e.target.value || '1', 10) - 1))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Column Mapping Table */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Intelligent Column Mapping
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Verify or adjust which column in your file corresponds to standard financial fields.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'dateCol', label: 'Transaction Date *', required: true, hint: 'Date, Txn Date, Value Date' },
                { key: 'descriptionCol', label: 'Description / Narration *', required: true, hint: 'Narration, Remarks, Particulars' },
                { key: 'amountCol', label: 'Amount (Single Column)', required: false, hint: 'If signed (+/-) or single amount' },
                { key: 'debitCol', label: 'Debit Column (Expenses)', required: false, hint: 'Withdrawal, Dr Amount, Spent' },
                { key: 'creditCol', label: 'Credit Column (Income)', required: false, hint: 'Deposit, Cr Amount, Received' },
                { key: 'paymentMethodCol', label: 'Payment Method / Mode', required: false, hint: 'Channel, Mode, Type' },
                { key: 'bankCol', label: 'Bank / Card Name', required: false, hint: 'Bank Name, Account, Card' },
                { key: 'referenceCol', label: 'Reference / UTR / Txn ID', required: false, hint: 'UTR, Ref No, Cheque No' },
              ].map((field) => (
                <div key={field.key} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {field.label}
                    </label>
                    <span className="text-[10px] text-gray-400">{field.hint}</span>
                  </div>
                  <select
                    value={(columnMapping as any)[field.key] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [field.key]: e.target.value || undefined,
                      }))
                    }
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">-- Not in file --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Save Template input */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-auto flex items-center space-x-2">
                <Save className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Save format template as (e.g. HDFC Salary Acc)..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-64"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Back
                </button>
                <button
                  onClick={generatePreview}
                  disabled={isUploading}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center space-x-2 shadow-xs disabled:opacity-50"
                >
                  <span>{isUploading ? 'Parsing rows...' : 'Generate Preview'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & INTERACTIVE VERIFICATION */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Detected</span>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{summary.totalDetected}</div>
              </div>
              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Valid</span>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{summary.validCount}</div>
              </div>
              <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20">
                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Total Debit (Expense)</span>
                <div className="text-xl font-bold text-rose-700 dark:text-rose-300">{formatINR(summary.totalDebit)}</div>
              </div>
              <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20">
                <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400">Total Credit (Income)</span>
                <div className="text-xl font-bold text-sky-700 dark:text-sky-300">{formatINR(summary.totalCredit)}</div>
              </div>
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20">
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Exact Duplicates</span>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{summary.exactDuplicatesCount}</div>
              </div>
              <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20">
                <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Potential Dups</span>
                <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{summary.potentialDuplicatesCount}</div>
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Info className="w-4 h-4 text-emerald-500" />
              <span>
                Importing <strong>{previewRecords.length - excludedTempIds.size}</strong> of {previewRecords.length} detected rows.
                Checkboxes toggle inclusion.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(selectedFile?.name.endsWith('.docx') ? 1 : 2)}
                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
              >
                Back
              </button>
              <button
                onClick={confirmImport}
                disabled={isUploading || previewRecords.length - excludedTempIds.size === 0}
                className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center space-x-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Import ({previewRecords.length - excludedTempIds.size})</span>
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
                  <tr className="text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={excludedTempIds.size === 0 && previewRecords.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setExcludedTempIds(new Set());
                          else setExcludedTempIds(new Set(previewRecords.map((r) => r.tempId)));
                        }}
                      />
                    </th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Bank</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {previewRecords.map((item) => {
                    const isExcluded = excludedTempIds.has(item.tempId);
                    return (
                      <tr
                        key={item.tempId}
                        className={`transition-colors ${
                          isExcluded
                            ? 'opacity-40 bg-gray-50/50 dark:bg-gray-900/30'
                            : item.isDuplicate
                            ? 'bg-amber-50/30 dark:bg-amber-950/20'
                            : item.isPotentialDuplicate
                            ? 'bg-purple-50/30 dark:bg-purple-950/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => toggleExclude(item.tempId)}
                          />
                        </td>
                        <td className="p-3 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDateIST(item.date)}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updatePreviewRecord(item.tempId, { description: e.target.value })}
                            className="w-full text-xs px-2 py-1 rounded bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          {item.referenceNumber && (
                            <span className="text-[10px] text-gray-400 block font-mono">
                              Ref: {item.referenceNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <select
                            value={item.type}
                            onChange={(e) => updatePreviewRecord(item.tempId, { type: e.target.value as any })}
                            className="text-xs px-2 py-1 rounded bg-transparent border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="EXPENSE">Expense</option>
                            <option value="INCOME">Income</option>
                            <option value="TRANSFER">Transfer</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            value={item.category}
                            onChange={(e) => updatePreviewRecord(item.tempId, { category: e.target.value })}
                            className="text-xs px-2 py-1 rounded bg-transparent border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                          >
                            {MASTER_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            value={item.paymentMethod}
                            onChange={(e) => updatePreviewRecord(item.tempId, { paymentMethod: e.target.value })}
                            className="text-xs px-2 py-1 rounded bg-transparent border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.bank || ''}
                            placeholder="Bank / Card"
                            onChange={(e) => updatePreviewRecord(item.tempId, { bank: e.target.value })}
                            className="w-28 text-xs px-2 py-1 rounded bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-emerald-500 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          {formatINR(item.amount)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {item.isDuplicate ? (
                            <span
                              title={item.duplicateReason}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                            >
                              Duplicate
                            </span>
                          ) : item.isPotentialDuplicate ? (
                            <span
                              title={item.duplicateReason}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400"
                            >
                              Potential Dup
                            </span>
                          ) : item.isValid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                              Ready
                            </span>
                          ) : (
                            <span
                              title={item.validationError}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400"
                            >
                              Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORT COMPLETED SUCCESSFULLY */}
      {step === 4 && (
        <div className="p-12 text-center rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Transactions Imported Successfully!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Successfully imported <strong>{importResult?.importedCount}</strong> records from &quot;{selectedFile?.name}&quot;.
            Total debit added: <strong>{formatINR(importResult?.totalDebit)}</strong>.
          </p>

          <div className="pt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => {
                setStep(1);
                setSelectedFile(null);
                setPreviewRecords([]);
                setSummary(null);
              }}
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Import Another File
            </button>
            <button
              onClick={() => router.push('/transactions')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md shadow-emerald-600/20"
            >
              View All Transactions
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-white"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
