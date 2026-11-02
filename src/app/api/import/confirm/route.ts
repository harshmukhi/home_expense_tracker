import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { safeRound } from '@/lib/currency';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fileName,
      fileType,
      records,
      saveMappingAs,
      mappingConfig,
      headerRowIndex,
      sheetName,
    } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, error: 'No transactions selected for import' }, { status: 400 });
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const r of records) {
      if (r.type === 'EXPENSE') totalDebit += r.amount;
      if (r.type === 'INCOME') totalCredit += r.amount;
    }

    // 1. Create ImportBatch
    const batch = await prisma.importBatch.create({
      data: {
        fileName: fileName || 'Imported File',
        fileType: fileType || 'XLSX',
        totalRecords: records.length,
        totalDebit: safeRound(totalDebit, 2),
        totalCredit: safeRound(totalCredit, 2),
        status: 'SUCCESS',
      },
    });

    // 2. Insert transactions
    const transactionData = records.map((r: any) => ({
      date: new Date(r.date),
      description: r.description,
      originalDescription: r.description,
      amount: safeRound(r.amount, 2),
      type: r.type || 'EXPENSE',
      category: r.category || 'Other',
      paymentMethod: r.paymentMethod || 'Other',
      bank: r.bank || null,
      cardOrAccount: r.cardOrAccount || null,
      referenceNumber: r.referenceNumber || null,
      sourceFile: fileName || 'Imported File',
      importBatchId: batch.id,
      isInternalTransfer: Boolean(r.isInternalTransfer),
      isCreditCardRepayment: Boolean(r.isCreditCardRepayment),
      uncertainCategorisation: Boolean(r.uncertainCategorisation),
      rawData: r.rawData ? JSON.stringify(r.rawData) : null,
    }));

    await prisma.transaction.createMany({
      data: transactionData,
    });

    // 3. Save mapping template if user gave a name
    if (saveMappingAs && mappingConfig) {
      await prisma.columnMapping.upsert({
        where: { name: saveMappingAs.trim() },
        update: {
          headerRowIndex: headerRowIndex || 0,
          sheetName: sheetName || null,
          mappings: JSON.stringify(mappingConfig),
        },
        create: {
          name: saveMappingAs.trim(),
          headerRowIndex: headerRowIndex || 0,
          sheetName: sheetName || null,
          mappings: JSON.stringify(mappingConfig),
        },
      });
    }

    // 4. Register Banks and Categories into master lists if not already existing
    const uniqueBanks = Array.from(new Set(records.map((r: any) => r.bank).filter(Boolean)));
    for (const bName of uniqueBanks) {
      await prisma.bank.upsert({
        where: { name: bName },
        update: {},
        create: { name: bName },
      });
    }

    const uniqueCategories = Array.from(new Set(records.map((r: any) => r.category).filter(Boolean)));
    for (const cName of uniqueCategories) {
      await prisma.category.upsert({
        where: { name: cName },
        update: {},
        create: { name: cName },
      });
    }

    // 5. Audit log
    await prisma.auditLog.create({
      data: {
        action: 'IMPORT_COMPLETED',
        details: `Imported ${records.length} transactions from "${fileName}" (Batch ID: ${batch.id})`,
      },
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      importedCount: records.length,
      totalDebit: safeRound(totalDebit, 2),
      totalCredit: safeRound(totalCredit, 2),
    });
  } catch (err: any) {
    console.error('Error in /api/import/confirm:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
