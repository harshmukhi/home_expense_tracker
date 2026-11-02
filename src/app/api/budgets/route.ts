import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { safeRound } from '@/lib/currency';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = searchParams.get('month') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;

    const start = new Date(year, monthIdx, 1, 0, 0, 0, 0);
    const end = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

    const [budget, txns] = await Promise.all([
      prisma.budget.findUnique({ where: { month } }),
      prisma.transaction.findMany({
        where: {
          date: { gte: start, lte: end },
          type: 'EXPENSE',
          isInternalTransfer: false,
          isCreditCardRepayment: false,
        },
      }),
    ]);

    let actualTotalSpend = 0;
    let actualCashSpend = 0;
    const actualCategorySpend: Record<string, number> = {};
    const actualBankSpend: Record<string, number> = {};

    for (const t of txns) {
      actualTotalSpend += t.amount;
      if (t.paymentMethod === 'Cash') actualCashSpend += t.amount;

      const cat = t.category || 'Other';
      actualCategorySpend[cat] = (actualCategorySpend[cat] || 0) + t.amount;

      if (t.bank) {
        actualBankSpend[t.bank] = (actualBankSpend[t.bank] || 0) + t.amount;
      }
    }

    if (!budget) {
      return NextResponse.json({
        success: true,
        hasBudget: false,
        month,
        actualTotalSpend: safeRound(actualTotalSpend, 2),
        actualCashSpend: safeRound(actualCashSpend, 2),
        actualCategorySpend,
        actualBankSpend,
      });
    }

    const categoryBudgets: Record<string, number> = budget.categoryBudgets ? JSON.parse(budget.categoryBudgets) : {};
    const bankLimits: Record<string, number> = budget.bankLimits ? JSON.parse(budget.bankLimits) : {};
    const alertThresholds: number[] = budget.alertThresholds ? JSON.parse(budget.alertThresholds) : [75, 90, 100];

    const utilization = budget.totalBudget > 0 ? safeRound((actualTotalSpend / budget.totalBudget) * 100, 1) : 0;
    const remainingBudget = safeRound(budget.totalBudget - actualTotalSpend, 2);

    // Alerts
    const alerts: { type: 'warning' | 'danger' | 'info'; message: string }[] = [];
    if (utilization >= 100) {
      alerts.push({
        type: 'danger',
        message: `Overall monthly budget exceeded! (Utilized: ${utilization}%, Over by ₹${Math.abs(remainingBudget).toLocaleString('en-IN')})`,
      });
    } else if (utilization >= 90) {
      alerts.push({
        type: 'danger',
        message: `High budget alert: ${utilization}% of total budget reached (Remaining: ₹${remainingBudget.toLocaleString('en-IN')})`,
      });
    } else if (utilization >= 75) {
      alerts.push({
        type: 'warning',
        message: `Budget warning: ${utilization}% of monthly limit reached`,
      });
    }

    // Category progress
    const categoryProgress = Object.entries(categoryBudgets).map(([category, limit]) => {
      const spent = actualCategorySpend[category] || 0;
      const catUtil = limit > 0 ? safeRound((spent / limit) * 100, 1) : 0;
      const catRemaining = safeRound(limit - spent, 2);

      if (catUtil >= 100) {
        alerts.push({
          type: 'danger',
          message: `Category "${category}" exceeded budget (₹${spent.toLocaleString('en-IN')} / ₹${limit.toLocaleString('en-IN')})`,
        });
      } else if (catUtil >= 90) {
        alerts.push({
          type: 'warning',
          message: `Category "${category}" is at ${catUtil}% of its limit`,
        });
      }

      return {
        category,
        limit,
        spent: safeRound(spent, 2),
        remaining: catRemaining,
        utilization: catUtil,
        isOverBudget: spent > limit,
      };
    });

    // Cash limit check
    let cashProgress = null;
    if (budget.cashLimit && budget.cashLimit > 0) {
      const cashUtil = safeRound((actualCashSpend / budget.cashLimit) * 100, 1);
      if (cashUtil >= 100) {
        alerts.push({
          type: 'danger',
          message: `Cash limit exceeded! (₹${actualCashSpend.toLocaleString('en-IN')} / ₹${budget.cashLimit.toLocaleString('en-IN')})`,
        });
      }
      cashProgress = {
        limit: budget.cashLimit,
        spent: safeRound(actualCashSpend, 2),
        remaining: safeRound(budget.cashLimit - actualCashSpend, 2),
        utilization: cashUtil,
      };
    }

    return NextResponse.json({
      success: true,
      hasBudget: true,
      month,
      budget: {
        id: budget.id,
        totalBudget: budget.totalBudget,
        remainingBudget,
        utilization,
        isOverBudget: actualTotalSpend > budget.totalBudget,
        categoryBudgets,
        categoryProgress,
        cashLimit: budget.cashLimit,
        cashProgress,
        bankLimits,
        alertThresholds,
      },
      actualTotalSpend: safeRound(actualTotalSpend, 2),
      actualCashSpend: safeRound(actualCashSpend, 2),
      actualCategorySpend,
      alerts,
    });
  } catch (err: any) {
    console.error('Error in GET /api/budgets:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { month, totalBudget, categoryBudgets, cashLimit, bankLimits, alertThresholds } = body;

    if (!month || totalBudget === undefined) {
      return NextResponse.json({ success: false, error: 'Month and totalBudget are required' }, { status: 400 });
    }

    const budget = await prisma.budget.upsert({
      where: { month },
      update: {
        totalBudget: parseFloat(totalBudget),
        categoryBudgets: categoryBudgets ? JSON.stringify(categoryBudgets) : null,
        cashLimit: cashLimit ? parseFloat(cashLimit) : null,
        bankLimits: bankLimits ? JSON.stringify(bankLimits) : null,
        alertThresholds: alertThresholds ? JSON.stringify(alertThresholds) : '[75, 90, 100]',
      },
      create: {
        month,
        totalBudget: parseFloat(totalBudget),
        categoryBudgets: categoryBudgets ? JSON.stringify(categoryBudgets) : null,
        cashLimit: cashLimit ? parseFloat(cashLimit) : null,
        bankLimits: bankLimits ? JSON.stringify(bankLimits) : null,
        alertThresholds: alertThresholds ? JSON.stringify(alertThresholds) : '[75, 90, 100]',
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_BUDGET',
        details: `Saved budget for ${month}: ₹${totalBudget}`,
      },
    });

    return NextResponse.json({ success: true, budget });
  } catch (err: any) {
    console.error('Error in POST /api/budgets:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
