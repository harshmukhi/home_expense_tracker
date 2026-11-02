/**
 * Currency and financial calculations utility with Indian formatting and decimal precision.
 */

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  
  // Format according to Indian Numbering System:
  // Last 3 digits grouped, then grouped by 2 digits: e.g., 12,34,567.89
  const fixed = absVal.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');
  
  let lastThree = integerPart.slice(-3);
  const otherNumbers = integerPart.slice(0, -3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  
  const formattedInteger =
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return `${isNegative ? '-' : ''}₹${formattedInteger}.${decimalPart}`;
}

export function safeRound(num: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

export function calculatePercentageChange(current: number, previous: number): {
  pct: number;
  direction: 'increase' | 'decrease' | 'equal';
  isInfinite: boolean;
} {
  if (previous === 0) {
    if (current === 0) return { pct: 0, direction: 'equal', isInfinite: false };
    return { pct: 100, direction: current > 0 ? 'increase' : 'decrease', isInfinite: true };
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = safeRound(Math.abs(change), 1);
  return {
    pct: rounded,
    direction: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'equal',
    isInfinite: false,
  };
}

export function formatDateIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function formatMonthYearIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}
