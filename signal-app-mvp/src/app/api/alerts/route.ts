import { NextRequest, NextResponse } from 'next/server';
import { listUserAlerts, upsertUserAlert } from '@/services/db/repositories';

const DEMO_USER_ID = 'demo-user';

export async function GET() {
  const alerts = await listUserAlerts(DEMO_USER_ID);
  return NextResponse.json({ alerts });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { symbol, threshold, enabled } = body as {
    symbol: string;
    threshold: number;
    enabled: boolean;
  };

  if (!symbol || typeof threshold !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await upsertUserAlert(DEMO_USER_ID, symbol, threshold, Boolean(enabled));
  return NextResponse.json({ ok: true });
}
