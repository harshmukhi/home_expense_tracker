import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { classifyTransaction } from '@/lib/categorizer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const paymentMethod = searchParams.get('paymentMethod');
    const bank = searchParams.get('bank');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: any = {};

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { referenceNumber: { contains: search } },
        { notes: { contains: search } },
        { bank: { contains: search } },
      ];
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      where.paymentMethod = paymentMethod;
    }

    if (bank && bank !== 'ALL') {
      where.bank = bank;
    }

    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        where.date.lte = e;
      }
    }

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      transactions,
    });
  } catch (err: any) {
    console.error('Error in GET /api/transactions:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, description, amount, type, category, paymentMethod, bank, cardOrAccount, referenceNumber, notes } = body;

    if (!date || !description || amount === undefined || !type) {
      return NextResponse.json({ success: false, error: 'Missing required transaction fields' }, { status: 400 });
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Auto classify if category or payment method wasn't provided
    const classified = classifyTransaction(description, paymentMethod);

    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        description,
        originalDescription: description,
        amount: amt,
        type: type || classified.detectedType || 'EXPENSE',
        category: category || classified.category,
        paymentMethod: paymentMethod || classified.paymentMethod,
        bank: bank || classified.bank,
        cardOrAccount: cardOrAccount || classified.cardOrAccount,
        referenceNumber,
        notes,
        isInternalTransfer: classified.isInternalTransfer,
        isCreditCardRepayment: classified.isCreditCardRepayment,
        sourceFile: 'Manual Entry',
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_TXN',
        details: `Manual transaction created: ${description} (₹${amt})`,
      },
    });

    return NextResponse.json({ success: true, transaction });
  } catch (err: any) {
    console.error('Error in POST /api/transactions:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ids, updates } = body;

    // Bulk update
    if (ids && Array.isArray(ids) && updates) {
      await prisma.transaction.updateMany({
        where: { id: { in: ids } },
        data: updates,
      });

      await prisma.auditLog.create({
        data: {
          action: 'BULK_UPDATE_TXN',
          details: `Updated ${ids.length} transactions with: ${JSON.stringify(updates)}`,
        },
      });

      return NextResponse.json({ success: true, count: ids.length });
    }

    // Single update
    if (id && updates) {
      if (updates.date) updates.date = new Date(updates.date);
      if (updates.amount !== undefined) updates.amount = parseFloat(updates.amount);

      const transaction = await prisma.transaction.update({
        where: { id },
        data: updates,
      });

      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_TXN',
          details: `Updated transaction #${id}`,
        },
      });

      return NextResponse.json({ success: true, transaction });
    }

    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in PUT /api/transactions:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean);
      const res = await prisma.transaction.deleteMany({
        where: { id: { in: ids } },
      });

      await prisma.auditLog.create({
        data: {
          action: 'BULK_DELETE_TXN',
          details: `Deleted ${res.count} transactions`,
        },
      });

      return NextResponse.json({ success: true, deletedCount: res.count });
    }

    if (id) {
      const deleted = await prisma.transaction.delete({
        where: { id },
      });

      await prisma.auditLog.create({
        data: {
          action: 'DELETE_TXN',
          details: `Deleted transaction: ${deleted.description} (₹${deleted.amount})`,
        },
      });

      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ success: false, error: 'Missing transaction id' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in DELETE /api/transactions:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
