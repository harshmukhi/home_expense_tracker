import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MASTER_CATEGORIES, PAYMENT_METHODS } from '@/lib/categorizer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Full Database Backup Export (JSON)
    if (action === 'backup') {
      const [
        transactions,
        categories,
        banks,
        cards,
        accounts,
        importBatches,
        columnMappings,
        budgets,
        recurringExpenses,
        userSettings,
        auditLogs,
      ] = await Promise.all([
        prisma.transaction.findMany(),
        prisma.category.findMany(),
        prisma.bank.findMany(),
        prisma.card.findMany(),
        prisma.account.findMany(),
        prisma.importBatch.findMany(),
        prisma.columnMapping.findMany(),
        prisma.budget.findMany(),
        prisma.recurringExpense.findMany(),
        prisma.userSetting.findMany(),
        prisma.auditLog.findMany({ take: 100, orderBy: { timestamp: 'desc' } }),
      ]);

      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: {
          transactions,
          categories,
          banks,
          cards,
          accounts,
          importBatches,
          columnMappings,
          budgets,
          recurringExpenses,
          userSettings,
          auditLogs,
        },
      };

      return new NextResponse(JSON.stringify(backupData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="smart-home-expenses-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    // Default: fetch master settings & records
    const [
      dbCategories,
      banks,
      cards,
      accounts,
      importBatches,
      columnMappings,
      auditLogs,
      userSettings,
    ] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
      prisma.bank.findMany({ orderBy: { name: 'asc' } }),
      prisma.card.findMany({ orderBy: { bankName: 'asc' } }),
      prisma.account.findMany({ orderBy: { bankName: 'asc' } }),
      prisma.importBatch.findMany({ orderBy: { importedAt: 'desc' } }),
      prisma.columnMapping.findMany({ orderBy: { name: 'asc' } }),
      prisma.auditLog.findMany({ take: 30, orderBy: { timestamp: 'desc' } }),
      prisma.userSetting.findMany(),
    ]);

    // Combine default master categories with custom categories in DB
    const allCategories = Array.from(
      new Set([...MASTER_CATEGORIES, ...dbCategories.map((c) => c.name)])
    ).sort();

    return NextResponse.json({
      success: true,
      config: {
        currency: 'INR (₹)',
        numberFormat: 'Indian (12,34,567.89)',
        timeZone: 'Asia/Kolkata',
      },
      categories: allCategories,
      customCategories: dbCategories,
      paymentMethods: PAYMENT_METHODS,
      banks,
      cards,
      accounts,
      importBatches,
      columnMappings,
      auditLogs,
      userSettings,
    });
  } catch (err: any) {
    console.error('Error in GET /api/settings:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'create_category') {
      const { name, keywords } = payload;
      const created = await prisma.category.create({
        data: {
          name: name.trim(),
          isCustom: true,
          keywords: keywords ? JSON.stringify(keywords) : null,
        },
      });
      return NextResponse.json({ success: true, item: created });
    }

    if (action === 'create_bank') {
      const { name, aliases } = payload;
      const created = await prisma.bank.create({
        data: {
          name: name.trim(),
          aliases: aliases ? JSON.stringify(aliases) : null,
        },
      });
      return NextResponse.json({ success: true, item: created });
    }

    if (action === 'create_card') {
      const { bankName, cardType, cardIdentifier } = payload;
      const created = await prisma.card.create({
        data: {
          bankName: bankName.trim(),
          cardType: cardType || 'CREDIT',
          cardIdentifier: cardIdentifier.trim(),
        },
      });
      return NextResponse.json({ success: true, item: created });
    }

    if (action === 'create_account') {
      const { bankName, accountNumber, accountType } = payload;
      const created = await prisma.account.create({
        data: {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountType: accountType || 'SAVINGS',
        },
      });
      return NextResponse.json({ success: true, item: created });
    }

    // Database Restore from JSON backup
    if (action === 'restore_backup') {
      const { backupData } = payload;
      if (!backupData || !backupData.data) {
        return NextResponse.json({ success: false, error: 'Invalid backup file structure' }, { status: 400 });
      }

      const { data } = backupData;

      // Reset and restore
      await prisma.transaction.deleteMany();
      await prisma.importBatch.deleteMany();
      await prisma.budget.deleteMany();
      await prisma.recurringExpense.deleteMany();
      await prisma.columnMapping.deleteMany();
      await prisma.card.deleteMany();
      await prisma.account.deleteMany();
      await prisma.bank.deleteMany();
      await prisma.category.deleteMany();

      if (data.categories?.length) {
        await prisma.category.createMany({ data: data.categories });
      }
      if (data.banks?.length) {
        await prisma.bank.createMany({ data: data.banks });
      }
      if (data.cards?.length) {
        await prisma.card.createMany({ data: data.cards });
      }
      if (data.accounts?.length) {
        await prisma.account.createMany({ data: data.accounts });
      }
      if (data.importBatches?.length) {
        const batches = data.importBatches.map((b: any) => ({
          ...b,
          importedAt: new Date(b.importedAt),
        }));
        await prisma.importBatch.createMany({ data: batches });
      }
      if (data.transactions?.length) {
        const txns = data.transactions.map((t: any) => ({
          ...t,
          date: new Date(t.date),
          importDate: new Date(t.importDate),
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }));
        await prisma.transaction.createMany({ data: txns });
      }
      if (data.columnMappings?.length) {
        const mappings = data.columnMappings.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        }));
        await prisma.columnMapping.createMany({ data: mappings });
      }
      if (data.budgets?.length) {
        const budgets = data.budgets.map((b: any) => ({
          ...b,
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt),
        }));
        await prisma.budget.createMany({ data: budgets });
      }
      if (data.recurringExpenses?.length) {
        const recurrings = data.recurringExpenses.map((r: any) => ({
          ...r,
          lastPaymentDate: r.lastPaymentDate ? new Date(r.lastPaymentDate) : null,
          nextExpectedDate: r.nextExpectedDate ? new Date(r.nextExpectedDate) : null,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        }));
        await prisma.recurringExpense.createMany({ data: recurrings });
      }

      await prisma.auditLog.create({
        data: {
          action: 'RESTORE_BACKUP',
          details: `Restored database from backup (${data.transactions?.length || 0} transactions)`,
        },
      });

      return NextResponse.json({ success: true, message: 'Database restored successfully' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/settings:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 1. Delete individual import batch (and all transactions in it)
    if (action === 'delete_batch') {
      const batchId = searchParams.get('batchId');
      if (!batchId) {
        return NextResponse.json({ success: false, error: 'Missing batchId' }, { status: 400 });
      }

      const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
      if (!batch) {
        return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
      }

      const deletedTxns = await prisma.transaction.deleteMany({
        where: { importBatchId: batchId },
      });

      await prisma.importBatch.delete({
        where: { id: batchId },
      });

      await prisma.auditLog.create({
        data: {
          action: 'DELETE_BATCH',
          details: `Deleted import batch "${batch.fileName}" and its ${deletedTxns.count} transactions`,
        },
      });

      return NextResponse.json({
        success: true,
        deletedBatchId: batchId,
        deletedTransactionsCount: deletedTxns.count,
      });
    }

    // 2. Delete column mapping template
    if (action === 'delete_mapping') {
      const mappingId = searchParams.get('mappingId');
      if (!mappingId) {
        return NextResponse.json({ success: false, error: 'Missing mappingId' }, { status: 400 });
      }
      await prisma.columnMapping.delete({ where: { id: mappingId } });
      return NextResponse.json({ success: true, deletedMappingId: mappingId });
    }

    // 3. Complete database reset with confirmation
    if (action === 'reset_database') {
      const confirmText = searchParams.get('confirm');
      if (confirmText !== 'RESET_ALL_DATA') {
        return NextResponse.json(
          { success: false, error: 'Confirmation string "RESET_ALL_DATA" required' },
          { status: 400 }
        );
      }

      await prisma.transaction.deleteMany();
      await prisma.importBatch.deleteMany();
      await prisma.budget.deleteMany();
      await prisma.recurringExpense.deleteMany();
      await prisma.columnMapping.deleteMany();
      await prisma.card.deleteMany();
      await prisma.account.deleteMany();
      await prisma.bank.deleteMany();
      await prisma.category.deleteMany();

      await prisma.auditLog.create({
        data: {
          action: 'RESET_DATABASE',
          details: 'User initiated complete database reset. All tables cleared.',
        },
      });

      return NextResponse.json({ success: true, message: 'Database reset successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid delete action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in DELETE /api/settings:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
