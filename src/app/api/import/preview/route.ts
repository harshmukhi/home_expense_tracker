import { NextRequest, NextResponse } from 'next/server';
import { parseExcelRows, ColumnMappingConfig } from '@/lib/importers/excelParser';
import { detectDuplicates } from '@/lib/duplicateDetector';
import { safeRound } from '@/lib/currency';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sheet = (formData.get('sheet') as string) || '';
    const headerRowIndex = parseInt((formData.get('headerRowIndex') as string) || '0', 10);
    const mappingJson = formData.get('mapping') as string;

    if (!file || !mappingJson) {
      return NextResponse.json({ success: false, error: 'File and mapping configuration are required' }, { status: 400 });
    }

    const mapping: ColumnMappingConfig = JSON.parse(mappingJson);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsedRecords = parseExcelRows(buffer, sheet, headerRowIndex, mapping, file.name);
    const duplicateAnalysis = await detectDuplicates(parsedRecords);

    // Calculate preview summary stats
    let totalDebit = 0;
    let totalCredit = 0;
    const detectedBanks = new Set<string>();
    const detectedMethods = new Set<string>();

    for (const item of duplicateAnalysis.items) {
      if (item.type === 'EXPENSE') totalDebit += item.amount;
      if (item.type === 'INCOME') totalCredit += item.amount;
      if (item.bank) detectedBanks.add(item.bank);
      if (item.paymentMethod) detectedMethods.add(item.paymentMethod);
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalDetected: duplicateAnalysis.totalIncoming,
        validCount: duplicateAnalysis.items.filter((i) => i.isValid).length,
        invalidCount: duplicateAnalysis.items.filter((i) => !i.isValid).length,
        exactDuplicatesCount: duplicateAnalysis.exactDuplicatesCount,
        potentialDuplicatesCount: duplicateAnalysis.potentialDuplicatesCount,
        newRecordsCount: duplicateAnalysis.newRecordsCount,
        totalDebit: safeRound(totalDebit, 2),
        totalCredit: safeRound(totalCredit, 2),
        detectedBanks: Array.from(detectedBanks),
        detectedMethods: Array.from(detectedMethods),
      },
      duplicateAnalysis,
    });
  } catch (err: any) {
    console.error('Error in /api/import/preview:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
