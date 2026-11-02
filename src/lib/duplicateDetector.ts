import { prisma } from './db';
import { ParsedTransactionPreview } from './importers/excelParser';

export interface DuplicateDetectionSummary {
  totalIncoming: number;
  newRecordsCount: number;
  exactDuplicatesCount: number;
  potentialDuplicatesCount: number;
  items: ParsedTransactionPreview[];
}

function normalizeDesc(d: string): string {
  return (d || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function areDatesSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function areDatesClose(d1: Date, d2: Date, maxDiffDays: number = 2): boolean {
  const diffMillis = Math.abs(d1.getTime() - d2.getTime());
  return diffMillis <= maxDiffDays * 24 * 60 * 60 * 1000;
}

export async function detectDuplicates(
  incomingRecords: ParsedTransactionPreview[]
): Promise<DuplicateDetectionSummary> {
  // If no incoming records, return empty
  if (!incomingRecords || incomingRecords.length === 0) {
    return {
      totalIncoming: 0,
      newRecordsCount: 0,
      exactDuplicatesCount: 0,
      potentialDuplicatesCount: 0,
      items: [],
    };
  }

  // Find min and max date of incoming records to query relevant DB window
  const dates = incomingRecords
    .map((r) => new Date(r.date))
    .filter((d) => !isNaN(d.getTime()));

  let existingTxns: any[] = [];
  if (dates.length > 0) {
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())) - 7 * 86400000);
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())) + 7 * 86400000);

    existingTxns = await prisma.transaction.findMany({
      where: {
        date: {
          gte: minDate,
          lte: maxDate,
        },
      },
      select: {
        id: true,
        date: true,
        amount: true,
        description: true,
        referenceNumber: true,
        bank: true,
        type: true,
      },
    });
  }

  let exactCount = 0;
  let potentialCount = 0;
  const processedRefNumbers = new Set<string>();

  const annotatedItems: ParsedTransactionPreview[] = incomingRecords.map((item, idx) => {
    const itemDate = new Date(item.date);
    const itemNormDesc = normalizeDesc(item.description);
    const itemRef = item.referenceNumber?.trim();

    // 1. Check in-batch duplicate reference
    if (itemRef && itemRef.length > 3) {
      if (processedRefNumbers.has(itemRef)) {
        exactCount++;
        return {
          ...item,
          isDuplicate: true,
          duplicateReason: `Duplicate reference number "${itemRef}" found within this file`,
        };
      }
      processedRefNumbers.add(itemRef);
    }

    // 2. Check against database records
    for (const existing of existingTxns) {
      const existingDate = new Date(existing.date);
      const isRefMatch =
        itemRef &&
        existing.referenceNumber &&
        itemRef.length > 3 &&
        existing.referenceNumber.trim().toLowerCase() === itemRef.toLowerCase();

      // Strong match by Reference Number
      if (isRefMatch) {
        exactCount++;
        return {
          ...item,
          isDuplicate: true,
          duplicateReason: `Matches existing transaction ref #${existing.referenceNumber} on ${existingDate.toISOString().slice(0, 10)}`,
        };
      }

      // Check date and amount
      const isAmountMatch = Math.abs(item.amount - existing.amount) < 0.01;
      const isSameDay = areDatesSameDay(itemDate, existingDate);
      const existingNormDesc = normalizeDesc(existing.description);

      if (isAmountMatch && isSameDay) {
        if (
          itemNormDesc === existingNormDesc ||
          itemNormDesc.includes(existingNormDesc) ||
          existingNormDesc.includes(itemNormDesc)
        ) {
          exactCount++;
          return {
            ...item,
            isDuplicate: true,
            duplicateReason: `Exact match: Same date, amount (₹${item.amount}), and description (${existing.description.slice(0, 30)})`,
          };
        } else {
          // Same day & same amount, but different narration -> Potential Duplicate
          potentialCount++;
          return {
            ...item,
            isPotentialDuplicate: true,
            duplicateReason: `Potential duplicate: Same date & amount (₹${item.amount}) as "${existing.description.slice(0, 30)}"`,
          };
        }
      }

      // Check within +/- 2 days with same amount & matching description
      if (isAmountMatch && areDatesClose(itemDate, existingDate, 2) && itemNormDesc.length > 4 && itemNormDesc === existingNormDesc) {
        potentialCount++;
        return {
          ...item,
          isPotentialDuplicate: true,
          duplicateReason: `Potential duplicate: Same amount & description within 2 days (${existingDate.toISOString().slice(0, 10)})`,
        };
      }
    }

    return item;
  });

  const newRecordsCount = annotatedItems.filter((i) => !i.isDuplicate && !i.isPotentialDuplicate).length;

  return {
    totalIncoming: incomingRecords.length,
    newRecordsCount,
    exactDuplicatesCount: exactCount,
    potentialDuplicatesCount: potentialCount,
    items: annotatedItems,
  };
}
