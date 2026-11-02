import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { safeRound } from '@/lib/currency';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const items = await prisma.recurringExpense.findMany({
      orderBy: { nextExpectedDate: 'asc' },
    });

    // Intelligent suggestion: scan recent 90 days transactions for repeat payments
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

    const txns = await prisma.transaction.findMany({
      where: {
        date: { gte: threeMonthsAgo },
        type: 'EXPENSE',
        isInternalTransfer: false,
        isCreditCardRepayment: false,
      },
      select: {
        description: true,
        amount: true,
        date: true,
        category: true,
        bank: true,
        paymentMethod: true,
      },
    });

    // Group by simplified name & amount
    const grouped = new Map<string, { count: number; lastDate: Date; sample: any }>();
    for (const t of txns) {
      const simplified = t.description.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().slice(0, 15);
      const key = `${simplified}_${Math.round(t.amount)}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
        if (new Date(t.date) > existing.lastDate) {
          existing.lastDate = new Date(t.date);
          existing.sample = t;
        }
      } else {
        grouped.set(key, { count: 1, lastDate: new Date(t.date), sample: t });
      }
    }

    const suggestions: any[] = [];
    for (const [key, val] of grouped.entries()) {
      if (val.count >= 2) {
        // Check if already in recurring items
        const alreadyAdded = items.some((it) => it.name.toLowerCase().includes(val.sample.description.toLowerCase().slice(0, 10)));
        if (!alreadyAdded) {
          const nextDate = new Date(val.lastDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          suggestions.push({
            name: val.sample.description,
            expectedAmount: safeRound(val.sample.amount, 2),
            frequency: 'MONTHLY',
            category: val.sample.category,
            bank: val.sample.bank,
            paymentMethod: val.sample.paymentMethod,
            lastPaymentDate: val.lastDate.toISOString(),
            nextExpectedDate: nextDate.toISOString(),
            occurrenceCount: val.count,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      recurringExpenses: items,
      suggestions,
    });
  } catch (err: any) {
    console.error('Error in GET /api/recurring:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, expectedAmount, frequency, category, paymentMethod, bank, lastPaymentDate, nextExpectedDate } = body;

    if (!name || expectedAmount === undefined || !category) {
      return NextResponse.json({ success: false, error: 'Name, amount, and category are required' }, { status: 400 });
    }

    const created = await prisma.recurringExpense.create({
      data: {
        name,
        expectedAmount: parseFloat(expectedAmount),
        frequency: frequency || 'MONTHLY',
        category,
        paymentMethod: paymentMethod || null,
        bank: bank || null,
        lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate) : null,
        nextExpectedDate: nextExpectedDate ? new Date(nextExpectedDate) : null,
        active: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_RECURRING',
        details: `Added recurring bill: ${name} (₹${expectedAmount})`,
      },
    });

    return NextResponse.json({ success: true, item: created });
  } catch (err: any) {
    console.error('Error in POST /api/recurring:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ success: false, error: 'Id and updates are required' }, { status: 400 });
    }

    if (updates.expectedAmount) updates.expectedAmount = parseFloat(updates.expectedAmount);
    if (updates.lastPaymentDate) updates.lastPaymentDate = new Date(updates.lastPaymentDate);
    if (updates.nextExpectedDate) updates.nextExpectedDate = new Date(updates.nextExpectedDate);

    const updated = await prisma.recurringExpense.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error('Error in PUT /api/recurring:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing recurring expense id' }, { status: 400 });
    }

    await prisma.recurringExpense.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Error in DELETE /api/recurring:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
