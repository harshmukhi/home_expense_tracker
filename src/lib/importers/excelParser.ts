import * as XLSX from 'xlsx';
import { classifyTransaction } from '../categorizer';

export interface ColumnMappingConfig {
  dateCol?: string;
  descriptionCol?: string;
  amountCol?: string;
  debitCol?: string;
  creditCol?: string;
  paymentMethodCol?: string;
  bankCol?: string;
  referenceCol?: string;
}

export interface ParsedTransactionPreview {
  tempId: string;
  date: string; // ISO string
  description: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  category: string;
  paymentMethod: string;
  bank?: string;
  cardOrAccount?: string;
  referenceNumber?: string;
  isInternalTransfer: boolean;
  isCreditCardRepayment: boolean;
  uncertainCategorisation: boolean;
  isValid: boolean;
  validationError?: string;
  isDuplicate?: boolean;
  isPotentialDuplicate?: boolean;
  duplicateReason?: string;
  rawData: Record<string, any>;
}

export interface ExcelAnalysisResult {
  fileName: string;
  sheetNames: string[];
  activeSheet: string;
  headerRowIndex: number;
  availableColumns: string[];
  suggestedMapping: ColumnMappingConfig;
  mappingConfidence: number; // 0 to 100
  needsManualMapping: boolean;
  rawSampleRows: any[][];
}

const FIELD_SYNONYMS: Record<keyof ColumnMappingConfig, string[]> = {
  dateCol: ['date', 'txn date', 'transaction date', 'value date', 'posting date', 'tran date', 'post date', 'entry date'],
  descriptionCol: ['narration', 'particulars', 'remarks', 'details', 'description', 'payee', 'transaction details', 'notes', 'merchant'],
  amountCol: ['amount', 'transaction amount', 'txn amount', 'value', 'inr', 'total', 'amt'],
  debitCol: ['debit', 'withdrawal', 'dr amount', 'dr', 'withdrawal amount', 'spent', 'debit (inr)', 'paid out'],
  creditCol: ['credit', 'deposit', 'cr amount', 'cr', 'deposit amount', 'received', 'credit (inr)', 'paid in'],
  paymentMethodCol: ['mode', 'channel', 'payment type', 'payment mode', 'type', 'method'],
  bankCol: ['bank', 'bank name', 'account', 'card', 'bank/card', 'acct'],
  referenceCol: ['utr', 'transaction id', 'txn id', 'reference no', 'reference', 'ref no.', 'ref no', 'chq no', 'cheque no', 'reference number'],
};

function normalizeHeader(h: any): string {
  if (h === null || h === undefined) return '';
  return String(h).trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

export function analyzeExcelBuffer(buffer: Buffer | ArrayBuffer, fileName: string, targetSheet?: string): ExcelAnalysisResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetNames = workbook.SheetNames;
  const activeSheet = targetSheet && sheetNames.includes(targetSheet) ? targetSheet : sheetNames[0];
  const worksheet = workbook.Sheets[activeSheet];

  // Convert worksheet to 2D array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // 1. Detect header row by finding the row with highest synonym match
  let bestHeaderRowIndex = 0;
  let maxMatchCount = -1;

  const maxScanRows = Math.min(rawRows.length, 15);
  for (let r = 0; r < maxScanRows; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let matchCount = 0;
    const normalizedRow = row.map(normalizeHeader);

    for (const synList of Object.values(FIELD_SYNONYMS)) {
      if (synList.some((syn) => normalizedRow.includes(syn))) {
        matchCount++;
      }
    }

    if (matchCount > maxMatchCount) {
      maxMatchCount = matchCount;
      bestHeaderRowIndex = r;
    }
  }

  const headerRow = rawRows[bestHeaderRowIndex] || [];
  const availableColumns: string[] = headerRow.map((c: any, idx: number) => {
    const s = String(c || '').trim();
    return s || `Column_${idx + 1}`;
  });

  // 2. Suggest column mappings
  const suggested: ColumnMappingConfig = {};
  const normalizedCols = availableColumns.map(normalizeHeader);

  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS) as [keyof ColumnMappingConfig, string[]][]) {
    for (const syn of synonyms) {
      const matchIdx = normalizedCols.findIndex((col) => col === syn || col.includes(syn));
      if (matchIdx !== -1 && !Object.values(suggested).includes(availableColumns[matchIdx])) {
        suggested[field] = availableColumns[matchIdx];
        break;
      }
    }
  }

  // Check if we have minimum requirements: date AND (amount OR (debit AND credit))
  const hasDate = Boolean(suggested.dateCol);
  const hasAmount = Boolean(suggested.amountCol || (suggested.debitCol && suggested.creditCol) || suggested.debitCol);
  const confidence = (hasDate ? 40 : 0) + (hasAmount ? 40 : 0) + (suggested.descriptionCol ? 20 : 0);

  const sampleRows = rawRows.slice(bestHeaderRowIndex, bestHeaderRowIndex + 6);

  return {
    fileName,
    sheetNames,
    activeSheet,
    headerRowIndex: bestHeaderRowIndex,
    availableColumns,
    suggestedMapping: suggested,
    mappingConfidence: confidence,
    needsManualMapping: confidence < 60,
    rawSampleRows: sampleRows,
  };
}

export function parseExcelRows(
  buffer: Buffer | ArrayBuffer,
  sheetName: string,
  headerRowIndex: number,
  mapping: ColumnMappingConfig,
  fileName: string
): ParsedTransactionPreview[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const worksheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rawRows.length <= headerRowIndex) {
    return [];
  }

  const headerRow = rawRows[headerRowIndex].map((c: any, i: number) => String(c || '').trim() || `Column_${i + 1}`);

  const colIndexMap: Record<string, number> = {};
  headerRow.forEach((h: string, idx: number) => {
    colIndexMap[h] = idx;
  });

  const getColVal = (row: any[], colName?: string): any => {
    if (!colName || colIndexMap[colName] === undefined) return undefined;
    return row[colIndexMap[colName]];
  };

  const results: ParsedTransactionPreview[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
      continue; // Skip empty rows
    }

    const rawData: Record<string, any> = {};
    headerRow.forEach((colName: string, idx: number) => {
      rawData[colName] = row[idx];
    });

    const rawDate = getColVal(row, mapping.dateCol);
    const rawDesc = getColVal(row, mapping.descriptionCol);
    const rawAmount = getColVal(row, mapping.amountCol);
    const rawDebit = getColVal(row, mapping.debitCol);
    const rawCredit = getColVal(row, mapping.creditCol);
    const rawMode = getColVal(row, mapping.paymentMethodCol);
    const rawBank = getColVal(row, mapping.bankCol);
    const rawRef = getColVal(row, mapping.referenceCol);

    // 1. Resolve Date
    const parsedDate = parseDateValue(rawDate);

    // 2. Resolve Amount & Type
    const { amount, type, isValidAmount, error } = resolveAmountAndType(rawAmount, rawDebit, rawCredit);

    // 3. Resolve Description
    const description = String(rawDesc || '').trim() || (type === 'EXPENSE' ? 'Debit Transaction' : 'Credit Transaction');

    // 4. Categorize & classify
    const classification = classifyTransaction(description, String(rawMode || ''));

    const bankName = rawBank ? String(rawBank).trim() : classification.bank;
    const refNumber = rawRef ? String(rawRef).trim() : undefined;

    const isValid = parsedDate !== null && isValidAmount;
    const validationError = !parsedDate
      ? 'Unrecognized or missing date'
      : !isValidAmount
      ? error || 'Invalid amount'
      : undefined;

    results.push({
      tempId: `tmp_${r}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: parsedDate ? parsedDate.toISOString() : new Date().toISOString(),
      description,
      amount,
      type: classification.detectedType || type,
      category: classification.category,
      paymentMethod: classification.paymentMethod,
      bank: bankName,
      cardOrAccount: classification.cardOrAccount,
      referenceNumber: refNumber,
      isInternalTransfer: classification.isInternalTransfer,
      isCreditCardRepayment: classification.isCreditCardRepayment,
      uncertainCategorisation: classification.uncertainCategorisation,
      isValid,
      validationError,
      rawData,
    });
  }

  return results;
}

export function parseDateValue(val: any): Date | null {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // Excel serial number
  if (typeof val === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = excelEpoch.getTime() + val * 86400000;
    const d = new Date(millis);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Try standard Date.parse
  const directParse = new Date(str);
  if (!isNaN(directParse.getTime()) && directParse.getFullYear() > 1990 && directParse.getFullYear() < 2100) {
    return directParse;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Handle YYYY/MM/DD or YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function cleanNumeric(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  // Remove commas, currency symbols, whitespace
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function resolveAmountAndType(
  rawAmount: any,
  rawDebit: any,
  rawCredit: any
): { amount: number; type: 'EXPENSE' | 'INCOME' | 'TRANSFER'; isValidAmount: boolean; error?: string } {
  const debit = cleanNumeric(rawDebit);
  const credit = cleanNumeric(rawCredit);

  if (debit > 0 && credit === 0) {
    return { amount: Math.abs(debit), type: 'EXPENSE', isValidAmount: true };
  }
  if (credit > 0 && debit === 0) {
    return { amount: Math.abs(credit), type: 'INCOME', isValidAmount: true };
  }

  if (rawAmount !== undefined && rawAmount !== null && String(rawAmount).trim() !== '') {
    const num = cleanNumeric(rawAmount);
    if (num < 0) {
      return { amount: Math.abs(num), type: 'EXPENSE', isValidAmount: true };
    } else if (num > 0) {
      // If single amount column with positive number, defaults to EXPENSE unless indicated otherwise
      return { amount: num, type: 'EXPENSE', isValidAmount: true };
    }
  }

  if (debit > 0 && credit > 0) {
    // Both filled: choose larger or default to debit
    return { amount: Math.abs(debit), type: 'EXPENSE', isValidAmount: true };
  }

  return { amount: 0, type: 'EXPENSE', isValidAmount: false, error: 'Amount is 0 or missing' };
}
