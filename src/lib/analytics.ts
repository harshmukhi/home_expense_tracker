import { prisma } from './db';
import { safeRound, calculatePercentageChange, formatINR } from './currency';

export interface DateFilterRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export function getDateRangeForFilter(filterType: string, customStart?: string, customEnd?: string): DateFilterRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  switch (filterType) {
    case 'today': {
      const start = new Date(year, month, date, 0, 0, 0, 0);
      const end = new Date(year, month, date, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: "Today" };
    }
    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(year, month, date + diffToMonday, 0, 0, 0, 0);
      const end = new Date(year, month, date, 23, 59, 59, 999);
      return { startDate: monday, endDate: end, label: "This Week" };
    }
    case 'prev_month': {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const start = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
      const end = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: "Previous Month" };
    }
    case 'last_3_months': {
      const start = new Date(year, month - 2, 1, 0, 0, 0, 0);
      const end = new Date(year, month, date, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: "Last 3 Months" };
    }
    case 'last_6_months': {
      const start = new Date(year, month - 5, 1, 0, 0, 0, 0);
      const end = new Date(year, month, date, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: "Last 6 Months" };
    }
    case 'this_year': {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: "This Year" };
    }
    case 'custom': {
      if (customStart && customEnd) {
        return {
          startDate: new Date(`${customStart}T00:00:00.000`),
          endDate: new Date(`${customEnd}T23:59:59.999`),
          label: `${customStart} to ${customEnd}`,
        };
      }
      // Fallback to this month
    }
    case 'this_month':
    default: {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: "This Month" };
    }
  }
}

export interface DashboardMetrics {
  totalMonthlyExpenses: number;
  totalYearlyExpenses: number;
  todayExpenses: number;
  monthlyIncome: number;
  netSavings: number;
  cashExpenses: number;
  cardExpenses: number; // Debit + Credit
  debitCardExpenses: number;
  creditCardExpenses: number;
  upiExpenses: number;
  bankTransferExpenses: number;
  otherExpenses: number;
  averageDailySpending: number;
  highestSpendingCategory: { category: string; amount: number } | null;
  totalTransactionsCount: number;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  bankBreakdown: { bank: string; amount: number; percentage: number }[];
  paymentMethodBreakdown: { method: string; amount: number; percentage: number }[];
  spendingTrend: { date: string; amount: number; income: number }[];
  top10Expenses: { id: string; date: string; description: string; amount: number; category: string; paymentMethod: string; bank?: string | null }[];
}

export async function getDashboardMetrics(filterType: string = 'this_month', customStart?: string, customEnd?: string): Promise<DashboardMetrics> {
  const { startDate, endDate } = getDateRangeForFilter(filterType, customStart, customEnd);

  // Exclude internal transfers and CC repayments from general household expense calculation
  const txns = await prisma.transaction.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  // Queries for yearly totals and today totals
  const [yearlyExpenseSum, todayExpenseSum] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: yearStart, lte: yearEnd },
        type: 'EXPENSE',
        isInternalTransfer: false,
        isCreditCardRepayment: false,
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: todayStart, lte: todayEnd },
        type: 'EXPENSE',
        isInternalTransfer: false,
        isCreditCardRepayment: false,
      },
    }),
  ]);

  let totalExpenses = 0;
  let totalIncome = 0;
  let cashExpenses = 0;
  let debitCardExpenses = 0;
  let creditCardExpenses = 0;
  let upiExpenses = 0;
  let bankTransferExpenses = 0;
  let otherExpenses = 0;

  const categoryMap = new Map<string, number>();
  const bankMap = new Map<string, number>();
  const methodMap = new Map<string, number>();
  const dailySpendMap = new Map<string, { expense: number; income: number }>();

  const validExpenses: any[] = [];

  for (const t of txns) {
    const isHouseholdExpense = t.type === 'EXPENSE' && !t.isInternalTransfer && !t.isCreditCardRepayment;
    const isIncome = t.type === 'INCOME';

    const dayKey = t.date.toISOString().slice(0, 10);
    if (!dailySpendMap.has(dayKey)) {
      dailySpendMap.set(dayKey, { expense: 0, income: 0 });
    }

    if (isHouseholdExpense) {
      totalExpenses += t.amount;
      validExpenses.push(t);

      dailySpendMap.get(dayKey)!.expense += t.amount;

      // Category aggregation
      const cat = t.category || 'Other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);

      // Bank aggregation
      const bName = t.bank ? t.bank.trim() : 'Unspecified Bank';
      bankMap.set(bName, (bankMap.get(bName) || 0) + t.amount);

      // Payment Method aggregation
      const pm = t.paymentMethod || 'Other';
      methodMap.set(pm, (methodMap.get(pm) || 0) + t.amount);

      if (pm === 'Cash') cashExpenses += t.amount;
      else if (pm === 'Debit Card') debitCardExpenses += t.amount;
      else if (pm === 'Credit Card') creditCardExpenses += t.amount;
      else if (pm === 'UPI') upiExpenses += t.amount;
      else if (pm === 'Bank Transfer') bankTransferExpenses += t.amount;
      else otherExpenses += t.amount;
    } else if (isIncome) {
      totalIncome += t.amount;
      dailySpendMap.get(dayKey)!.income += t.amount;
    }
  }

  // Days in selected range for average daily calculation
  const diffDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
  const avgDaily = totalExpenses > 0 ? safeRound(totalExpenses / diffDays, 2) : 0;

  // Highest spending category
  let highestCat: { category: string; amount: number } | null = null;
  for (const [cat, amt] of categoryMap.entries()) {
    if (!highestCat || amt > highestCat.amount) {
      highestCat = { category: cat, amount: safeRound(amt, 2) };
    }
  }

  // Top 10 expense transactions
  const top10 = [...validExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      date: t.date.toISOString().slice(0, 10),
      description: t.description,
      amount: safeRound(t.amount, 2),
      category: t.category,
      paymentMethod: t.paymentMethod,
      bank: t.bank,
    }));

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount: safeRound(amount, 2),
      percentage: totalExpenses > 0 ? safeRound((amount / totalExpenses) * 100, 1) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const bankBreakdown = Array.from(bankMap.entries())
    .map(([bank, amount]) => ({
      bank,
      amount: safeRound(amount, 2),
      percentage: totalExpenses > 0 ? safeRound((amount / totalExpenses) * 100, 1) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const paymentMethodBreakdown = Array.from(methodMap.entries())
    .map(([method, amount]) => ({
      method,
      amount: safeRound(amount, 2),
      percentage: totalExpenses > 0 ? safeRound((amount / totalExpenses) * 100, 1) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const spendingTrend = Array.from(dailySpendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      amount: safeRound(vals.expense, 2),
      income: safeRound(vals.income, 2),
    }));

  return {
    totalMonthlyExpenses: safeRound(totalExpenses, 2),
    totalYearlyExpenses: safeRound(yearlyExpenseSum._sum.amount || 0, 2),
    todayExpenses: safeRound(todayExpenseSum._sum.amount || 0, 2),
    monthlyIncome: safeRound(totalIncome, 2),
    netSavings: safeRound(totalIncome - totalExpenses, 2),
    cashExpenses: safeRound(cashExpenses, 2),
    cardExpenses: safeRound(debitCardExpenses + creditCardExpenses, 2),
    debitCardExpenses: safeRound(debitCardExpenses, 2),
    creditCardExpenses: safeRound(creditCardExpenses, 2),
    upiExpenses: safeRound(upiExpenses, 2),
    bankTransferExpenses: safeRound(bankTransferExpenses, 2),
    otherExpenses: safeRound(otherExpenses, 2),
    averageDailySpending: avgDaily,
    highestSpendingCategory: highestCat,
    totalTransactionsCount: txns.length,
    categoryBreakdown,
    bankBreakdown,
    paymentMethodBreakdown,
    spendingTrend,
    top10Expenses: top10,
  };
}

export interface MonthSummary {
  monthStr: string; // YYYY-MM
  label: string;
  totalExpenses: number;
  totalIncome: number;
  netSavings: number;
  avgDailySpending: number;
  highestSpendingDay: { date: string; amount: number } | null;
  lowestSpendingDay: { date: string; amount: number } | null;
  highestIndividualTxn: { description: string; amount: number; date: string } | null;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  bankBreakdown: { bank: string; amount: number; percentage: number }[];
  paymentMethodBreakdown: { method: string; amount: number; percentage: number }[];
  dailySpending: { date: string; amount: number }[];
  top10: any[];
  totalTxnCount: number;
}

export async function getMonthAnalysis(year: number, monthIndex: number): Promise<MonthSummary> {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  const daysInMonth = end.getDate();

  const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const monthLabel = start.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const txns = await prisma.transaction.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    orderBy: { date: 'asc' },
  });

  let totalExpenses = 0;
  let totalIncome = 0;
  const dayMap = new Map<string, number>();
  const catMap = new Map<string, number>();
  const bankMap = new Map<string, number>();
  const methodMap = new Map<string, number>();

  let highestTxn: any = null;
  const expenseTxns: any[] = [];

  for (const t of txns) {
    if (t.type === 'EXPENSE' && !t.isInternalTransfer && !t.isCreditCardRepayment) {
      totalExpenses += t.amount;
      expenseTxns.push(t);

      const dKey = t.date.toISOString().slice(0, 10);
      dayMap.set(dKey, (dayMap.get(dKey) || 0) + t.amount);

      const cat = t.category || 'Other';
      catMap.set(cat, (catMap.get(cat) || 0) + t.amount);

      const b = t.bank ? t.bank.trim() : 'Unspecified';
      bankMap.set(b, (bankMap.get(b) || 0) + t.amount);

      const m = t.paymentMethod || 'Other';
      methodMap.set(m, (methodMap.get(m) || 0) + t.amount);

      if (!highestTxn || t.amount > highestTxn.amount) {
        highestTxn = t;
      }
    } else if (t.type === 'INCOME') {
      totalIncome += t.amount;
    }
  }

  let highDay: { date: string; amount: number } | null = null;
  let lowDay: { date: string; amount: number } | null = null;

  for (const [d, amt] of dayMap.entries()) {
    if (!highDay || amt > highDay.amount) highDay = { date: d, amount: safeRound(amt, 2) };
    if (!lowDay || amt < lowDay.amount) lowDay = { date: d, amount: safeRound(amt, 2) };
  }

  const categoryBreakdown = Array.from(catMap.entries())
    .map(([category, amount]) => ({
      category,
      amount: safeRound(amount, 2),
      percentage: totalExpenses > 0 ? safeRound((amount / totalExpenses) * 100, 1) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const bankBreakdown = Array.from(bankMap.entries())
    .map(([bank, amount]) => ({
      bank,
      amount: safeRound(amount, 2),
      percentage: totalExpenses > 0 ? safeRound((amount / totalExpenses) * 100, 1) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const paymentMethodBreakdown = Array.from(methodMap.entries())
    .map(([method, amount]) => ({
      method,
      amount: safeRound(amount, 2),
      percentage: totalExpenses > 0 ? safeRound((amount / totalExpenses) * 100, 1) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const dailySpending = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount: safeRound(amount, 2) }));

  const top10 = [...expenseTxns]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return {
    monthStr,
    label: monthLabel,
    totalExpenses: safeRound(totalExpenses, 2),
    totalIncome: safeRound(totalIncome, 2),
    netSavings: safeRound(totalIncome - totalExpenses, 2),
    avgDailySpending: safeRound(totalExpenses / daysInMonth, 2),
    highestSpendingDay: highDay,
    lowestSpendingDay: lowDay,
    highestIndividualTxn: highestTxn
      ? {
          description: highestTxn.description,
          amount: safeRound(highestTxn.amount, 2),
          date: highestTxn.date.toISOString().slice(0, 10),
        }
      : null,
    categoryBreakdown,
    bankBreakdown,
    paymentMethodBreakdown,
    dailySpending,
    top10,
    totalTxnCount: txns.length,
  };
}

export interface MonthComparisonResult {
  monthA: MonthSummary;
  monthB: MonthSummary;
  expenseDiff: number;
  expensePctChange: { pct: number; direction: 'increase' | 'decrease' | 'equal'; isInfinite: boolean };
  incomeDiff: number;
  savingsDiff: number;
  categoryDiffs: {
    category: string;
    amountA: number;
    amountB: number;
    diff: number;
    pctChange: { pct: number; direction: 'increase' | 'decrease' | 'equal'; isInfinite: boolean };
  }[];
  increasedCategories: string[];
  decreasedCategories: string[];
  bankDiffs: { bank: string; amountA: number; amountB: number; diff: number }[];
  cashChange: { amountA: number; amountB: number; diff: number };
  cardChange: { amountA: number; amountB: number; diff: number };
}

export function compareMonths(monthA: MonthSummary, monthB: MonthSummary): MonthComparisonResult {
  const expenseDiff = safeRound(monthB.totalExpenses - monthA.totalExpenses, 2);
  const expensePctChange = calculatePercentageChange(monthB.totalExpenses, monthA.totalExpenses);
  const incomeDiff = safeRound(monthB.totalIncome - monthA.totalIncome, 2);
  const savingsDiff = safeRound(monthB.netSavings - monthA.netSavings, 2);

  const allCategories = Array.from(
    new Set([...monthA.categoryBreakdown.map((c) => c.category), ...monthB.categoryBreakdown.map((c) => c.category)])
  );

  const categoryDiffs = allCategories.map((cat) => {
    const amtA = monthA.categoryBreakdown.find((c) => c.category === cat)?.amount || 0;
    const amtB = monthB.categoryBreakdown.find((c) => c.category === cat)?.amount || 0;
    const diff = safeRound(amtB - amtA, 2);
    const pctChange = calculatePercentageChange(amtB, amtA);
    return {
      category: cat,
      amountA: amtA,
      amountB: amtB,
      diff,
      pctChange,
    };
  }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const increasedCategories = categoryDiffs.filter((c) => c.diff > 0).map((c) => c.category);
  const decreasedCategories = categoryDiffs.filter((c) => c.diff < 0).map((c) => c.category);

  const allBanks = Array.from(
    new Set([...monthA.bankBreakdown.map((b) => b.bank), ...monthB.bankBreakdown.map((b) => b.bank)])
  );

  const bankDiffs = allBanks.map((b) => {
    const amtA = monthA.bankBreakdown.find((x) => x.bank === b)?.amount || 0;
    const amtB = monthB.bankBreakdown.find((x) => x.bank === b)?.amount || 0;
    return { bank: b, amountA: amtA, amountB: amtB, diff: safeRound(amtB - amtA, 2) };
  }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const cashA = monthA.paymentMethodBreakdown.find((m) => m.method === 'Cash')?.amount || 0;
  const cashB = monthB.paymentMethodBreakdown.find((m) => m.method === 'Cash')?.amount || 0;

  const cardA =
    (monthA.paymentMethodBreakdown.find((m) => m.method === 'Debit Card')?.amount || 0) +
    (monthA.paymentMethodBreakdown.find((m) => m.method === 'Credit Card')?.amount || 0);
  const cardB =
    (monthB.paymentMethodBreakdown.find((m) => m.method === 'Debit Card')?.amount || 0) +
    (monthB.paymentMethodBreakdown.find((m) => m.method === 'Credit Card')?.amount || 0);

  return {
    monthA,
    monthB,
    expenseDiff,
    expensePctChange,
    incomeDiff,
    savingsDiff,
    categoryDiffs,
    increasedCategories,
    decreasedCategories,
    bankDiffs,
    cashChange: { amountA: cashA, amountB: cashB, diff: safeRound(cashB - cashA, 2) },
    cardChange: { amountA: cardA, amountB: cardB, diff: safeRound(cardB - cardA, 2) },
  };
}

export function generateIntelligentObservations(current: MonthSummary, previous?: MonthSummary): string[] {
  const observations: string[] = [];

  if (current.totalExpenses === 0) {
    return ['No expense transactions recorded for this month.'];
  }

  // 1. Month-over-month change
  if (previous && previous.totalExpenses > 0) {
    const change = calculatePercentageChange(current.totalExpenses, previous.totalExpenses);
    if (change.direction === 'increase') {
      observations.push(`Total household expenditure increased by ${change.pct}% (${formatINR(current.totalExpenses - previous.totalExpenses)}) compared to ${previous.label}.`);
    } else if (change.direction === 'decrease') {
      observations.push(`Total household expenditure decreased by ${change.pct}% (${formatINR(previous.totalExpenses - current.totalExpenses)}) compared to ${previous.label}.`);
    } else {
      observations.push(`Total household expenditure was identical to ${previous.label}.`);
    }
  }

  // 2. Highest spending category
  if (current.categoryBreakdown.length > 0) {
    const topCat = current.categoryBreakdown[0];
    observations.push(`The highest spending category was "${topCat.category}" at ${formatINR(topCat.amount)} (${topCat.percentage}% of monthly spending).`);
  }

  // 3. Payment method distribution
  const cashMethod = current.paymentMethodBreakdown.find((m) => m.method === 'Cash');
  if (cashMethod && cashMethod.amount > 0) {
    observations.push(`Cash transactions accounted for ${cashMethod.percentage}% (${formatINR(cashMethod.amount)}) of total monthly expenses.`);
  }

  const upiMethod = current.paymentMethodBreakdown.find((m) => m.method === 'UPI');
  if (upiMethod && upiMethod.amount > 0) {
    observations.push(`UPI transactions represented ${upiMethod.percentage}% (${formatINR(upiMethod.amount)}) of monthly expenses.`);
  }

  // 4. Highest Bank or Card expenditure
  const cardBanks = current.bankBreakdown.filter((b) => b.bank !== 'Unspecified');
  if (cardBanks.length > 0) {
    const topBank = cardBanks[0];
    observations.push(`The bank with the highest expenditure was ${topBank.bank} with ${formatINR(topBank.amount)} (${topBank.percentage}%).`);
  }

  // 5. Highest individual transaction
  if (current.highestIndividualTxn) {
    observations.push(`The single largest transaction was ${formatINR(current.highestIndividualTxn.amount)} for "${current.highestIndividualTxn.description}" on ${current.highestIndividualTxn.date}.`);
  }

  // 6. Net savings observation
  if (current.totalIncome > 0) {
    const savingsRate = safeRound((current.netSavings / current.totalIncome) * 100, 1);
    if (current.netSavings >= 0) {
      observations.push(`Household net savings was positive at ${formatINR(current.netSavings)} (Savings rate: ${savingsRate}%).`);
    } else {
      observations.push(`Net deficit of ${formatINR(Math.abs(current.netSavings))} incurred as expenses exceeded total income.`);
    }
  }

  return observations;
}
