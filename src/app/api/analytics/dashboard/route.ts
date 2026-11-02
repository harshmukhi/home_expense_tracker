import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'this_month';
    const customStart = searchParams.get('customStart') || undefined;
    const customEnd = searchParams.get('customEnd') || undefined;

    const metrics = await getDashboardMetrics(filter, customStart, customEnd);
    return NextResponse.json({ success: true, metrics });
  } catch (err: any) {
    console.error('Error in /api/analytics/dashboard:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
