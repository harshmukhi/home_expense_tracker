import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'xlsx'; // 'xlsx' or 'csv'
    const category = searchParams.get('category');
    const paymentMethod = searchParams.get('paymentMethod');
    const bank = searchParams.get('bank');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (category && category !== 'ALL') where.category = category;
    if (paymentMethod && paymentMethod !== 'ALL') where.paymentMethod = paymentMethod;
    if (bank && bank !== 'ALL') where.bank = bank;
    if (type && type !== 'ALL') where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        where.date.lte = e;
      }
    }

    const txns = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const exportRows = txns.map((t) => ({
      'Transaction ID': t.id,
      Date: t.date.toISOString().slice(0, 10),
      Description: t.description,
      Amount: t.amount,
      Type: t.type,
      Category: t.category,
      'Payment Method': t.paymentMethod,
      Bank: t.bank || '',
      'Card/Account': t.cardOrAccount || '',
      'Reference Number': t.referenceNumber || '',
      'Source File': t.sourceFile || '',
      Notes: t.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse(csvOutput, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="transactions-${timestamp}.csv"`,
        },
      });
    } else {
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="transactions-${timestamp}.xlsx"`,
        },
      });
    }
  } catch (err: any) {
    console.error('Error in /api/export:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
