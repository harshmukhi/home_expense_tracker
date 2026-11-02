import { NextRequest, NextResponse } from 'next/server';
import { getMonthAnalysis, compareMonths, generateIntelligentObservations } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth()), 10); // 0-indexed

    const currentMonth = await getMonthAnalysis(year, month);

    // Optional comparison month
    const compareYearParam = searchParams.get('compareYear');
    const compareMonthParam = searchParams.get('compareMonth');

    let comparison = null;
    let previousMonth = null;

    if (compareYearParam !== null && compareMonthParam !== null) {
      const cYear = parseInt(compareYearParam, 10);
      const cMonth = parseInt(compareMonthParam, 10);
      const compMonthData = await getMonthAnalysis(cYear, cMonth);
      comparison = compareMonths(compMonthData, currentMonth);
      previousMonth = compMonthData;
    } else {
      // By default compare to immediately preceding month
      const prevYear = month === 0 ? year - 1 : year;
      const prevMonthIdx = month === 0 ? 11 : month - 1;
      previousMonth = await getMonthAnalysis(prevYear, prevMonthIdx);
      comparison = compareMonths(previousMonth, currentMonth);
    }

    const observations = generateIntelligentObservations(currentMonth, previousMonth || undefined);

    return NextResponse.json({
      success: true,
      currentMonth,
      previousMonth,
      comparison,
      observations,
    });
  } catch (err: any) {
    console.error('Error in /api/analytics/monthly:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
