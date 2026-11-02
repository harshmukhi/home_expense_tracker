import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { safeRound, calculatePercentageChange } from '@/lib/currency';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);

    const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const prevYearStart = new Date(year - 1, 0, 1, 0, 0, 0, 0);
    const prevYearEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);

    const [txns, prevTxns] = await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gte: yearStart, lte: yearEnd } },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: prevYearStart, lte: prevYearEnd } },
      }),
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = monthNames.map((name, idx) => ({
      monthIndex: idx,
      monthName: name,
      expenses: 0,
      income: 0,
      savings: 0,
    }));

    let totalYearlyExpenses = 0;
    let totalYearlyIncome = 0;
    const categoryMap = new Map<string, number>();
    const bankMap = new Map<string, number>();

    for (const t of txns) {
      const mIdx = new Date(t.date).getMonth();
      const isHouseholdExpense = t.type === 'EXPENSE' && !t.isInternalTransfer && !t.isCreditCardRepayment;

      if (isHouseholdExpense) {
        totalYearlyExpenses += t.amount;
        monthlyData[mIdx].expenses += t.amount;

        const cat = t.category || 'Other';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);

        const b = t.bank ? t.bank.trim() : 'Unspecified';
        bankMap.set(b, (bankMap.get(b) || 0) + t.amount);
      } else if (t.type === 'INCOME') {
        totalYearlyIncome += t.amount;
        monthlyData[mIdx].income += t.amount;
      }
    }

    monthlyData.forEach((m) => {
      m.expenses = safeRound(m.expenses, 2);
      m.income = safeRound(m.income, 2);
      m.savings = safeRound(m.income - m.expenses, 2);
    });

    // Previous year total
    let prevYearExpenses = 0;
    let prevYearIncome = 0;
    for (const pt of prevTxns) {
      if (pt.type === 'EXPENSE' && !pt.isInternalTransfer && !pt.isCreditCardRepayment) {
        prevYearExpenses += pt.amount;
      } else if (pt.type === 'INCOME') {
        prevYearIncome += pt.amount;
      }
    }

    const yoyExpenseChange = calculatePercentageChange(totalYearlyExpenses, prevYearExpenses);
    const yoyIncomeChange = calculatePercentageChange(totalYearlyIncome, prevYearIncome);

    // Active months (with > 0 expenses or up to current month if current year)
    const activeMonths = monthlyData.filter((m) => m.expenses > 0);
    const monthsCount = activeMonths.length > 0 ? activeMonths.length : 1;
    const monthlyAverage = safeRound(totalYearlyExpenses / monthsCount, 2);

    let highestMonth = null;
    let lowestMonth = null;

    if (activeMonths.length > 0) {
      const sorted = [...activeMonths].sort((a, b) => b.expenses - a.expenses);
      highestMonth = sorted[0];
      lowestMonth = sorted[sorted.length - 1];
    }

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: safeRound(amount, 2),
        percentage: totalYearlyExpenses > 0 ? safeRound((amount / totalYearlyExpenses) * 100, 1) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const bankBreakdown = Array.from(bankMap.entries())
      .map(([bank, amount]) => ({
        bank,
        amount: safeRound(amount, 2),
        percentage: totalYearlyExpenses > 0 ? safeRound((amount / totalYearlyExpenses) * 100, 1) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      success: true,
      year,
      totalYearlyExpenses: safeRound(totalYearlyExpenses, 2),
      totalYearlyIncome: safeRound(totalYearlyIncome, 2),
      yearlySavings: safeRound(totalYearlyIncome - totalYearlyExpenses, 2),
      monthlyAverage,
      highestMonth,
      lowestMonth,
      monthlyBreakdown: monthlyData,
      prevYear: {
        year: year - 1,
        totalExpenses: safeRound(prevYearExpenses, 2),
        totalIncome: safeRound(prevYearIncome, 2),
        expenseChange: yoyExpenseChange,
        incomeChange: yoyIncomeChange,
      },
      categoryBreakdown,
      bankBreakdown,
    });
  } catch (err: any) {
    console.error('Error in /api/analytics/yearly:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
