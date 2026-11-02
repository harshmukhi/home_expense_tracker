import mammoth from 'mammoth';
import { classifyTransaction } from '../categorizer';
import { parseDateValue, ParsedTransactionPreview } from './excelParser';

export async function parseDocxBuffer(buffer: Buffer, fileName: string): Promise<ParsedTransactionPreview[]> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  const records: ParsedTransactionPreview[] = [];

  // 1. First parse HTML tables if any exist
  const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
  if (tableMatches && tableMatches.length > 0) {
    for (const tableHtml of tableMatches) {
      const rows = parseHtmlTable(tableHtml);
      if (rows.length > 1) {
        // Find best column index for date, amount, description
        const headers = rows[0].map((h) => h.toLowerCase().trim());
        let dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('dt'));
        let descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('particular') || h.includes('narration') || h.includes('item'));
        let amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('amt') || h.includes('price') || h.includes('cost') || h.includes('rs') || h.includes('inr'));
        let modeIdx = headers.findIndex((h) => h.includes('mode') || h.includes('payment') || h.includes('method') || h.includes('type'));
        let bankIdx = headers.findIndex((h) => h.includes('bank') || h.includes('card') || h.includes('account'));

        // If no explicit headers matched, heuristic based on first data row
        if (dateIdx === -1 && rows[1]) {
          rows[1].forEach((val, i) => {
            if (parseDateValue(val)) dateIdx = i;
            else if (cleanDocxAmount(val) > 0 && amountIdx === -1) amountIdx = i;
          });
        }
        if (descIdx === -1) {
          descIdx = [0, 1, 2].find((i) => i !== dateIdx && i !== amountIdx) ?? 1;
        }

        const startRow = (dateIdx !== -1 || amountIdx !== -1) && headers.some((h) => isNaN(parseFloat(h))) ? 1 : 0;

        for (let r = startRow; r < rows.length; r++) {
          const row = rows[r];
          const rawDate = dateIdx !== -1 ? row[dateIdx] : undefined;
          const rawAmount = amountIdx !== -1 ? row[amountIdx] : undefined;
          const rawDesc = descIdx !== -1 ? row[descIdx] : row.join(' ');
          const rawMode = modeIdx !== -1 ? row[modeIdx] : undefined;
          const rawBank = bankIdx !== -1 ? row[bankIdx] : undefined;

          const parsedDate = parseDateValue(rawDate);
          const amount = cleanDocxAmount(rawAmount);

          if (parsedDate || amount > 0) {
            const desc = (rawDesc || 'Document Expense').replace(/<[^>]*>/g, '').trim();
            const classification = classifyTransaction(desc, rawMode);

            records.push({
              tempId: `docx_tbl_${r}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              date: parsedDate ? parsedDate.toISOString() : new Date().toISOString(),
              description: desc,
              amount,
              type: classification.detectedType || 'EXPENSE',
              category: classification.category,
              paymentMethod: classification.paymentMethod,
              bank: rawBank || classification.bank,
              cardOrAccount: classification.cardOrAccount,
              referenceNumber: undefined,
              isInternalTransfer: classification.isInternalTransfer,
              isCreditCardRepayment: classification.isCreditCardRepayment,
              uncertainCategorisation: classification.uncertainCategorisation,
              isValid: parsedDate !== null && amount > 0,
              validationError: !parsedDate ? 'Missing valid date' : amount <= 0 ? 'Missing valid amount' : undefined,
              rawData: { row, table: true },
            });
          }
        }
      }
    }
  }

  // 2. Extract paragraphs and list items
  const textResult = await mammoth.extractRawText({ buffer });
  const lines = textResult.value.split('\n').map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if line contains both a monetary amount and text
    const amountMatch = line.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)\s*(?:₹|rs\.?|inr)?/i);
    const dateMatch = line.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);

    if (amountMatch) {
      const amtVal = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (amtVal > 0) {
        const parsedDate = dateMatch ? parseDateValue(dateMatch[1]) : null;
        let desc = line
          .replace(amountMatch[0], '')
          .replace(dateMatch ? dateMatch[0] : '', '')
          .replace(/[•\-\*\:\;]/g, '')
          .trim();

        if (!desc) desc = 'Expense from document';

        // Check if this line was already captured by table parsing
        const alreadyInTable = records.some(
          (r) => Math.abs(r.amount - amtVal) < 0.01 && r.description.toLowerCase().includes(desc.toLowerCase().slice(0, 10))
        );

        if (!alreadyInTable) {
          const classification = classifyTransaction(desc);
          records.push({
            tempId: `docx_p_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            date: parsedDate ? parsedDate.toISOString() : new Date().toISOString(),
            description: desc,
            amount: amtVal,
            type: classification.detectedType || 'EXPENSE',
            category: classification.category,
            paymentMethod: classification.paymentMethod,
            bank: classification.bank,
            cardOrAccount: classification.cardOrAccount,
            isInternalTransfer: classification.isInternalTransfer,
            isCreditCardRepayment: classification.isCreditCardRepayment,
            uncertainCategorisation: classification.uncertainCategorisation,
            isValid: parsedDate !== null && amtVal > 0,
            validationError: !parsedDate ? 'Could not automatically detect date (defaults to today)' : undefined,
            rawData: { line },
          });
        }
      }
    }
  }

  return records;
}

function parseHtmlTable(tableHtml: string): string[][] {
  const rows: string[][] = [];
  const rowMatches = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const tr of rowMatches) {
    const cells: string[] = [];
    const cellMatches = tr.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi) || [];
    for (const cell of cellMatches) {
      const clean = cell
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
      cells.push(clean);
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

function cleanDocxAmount(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}
