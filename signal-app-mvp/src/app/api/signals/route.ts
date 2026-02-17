import { NextResponse } from 'next/server';
import { getLatestSignals } from '@/services/db/repositories';

export async function GET() {
  const signals = await getLatestSignals(50);
  return NextResponse.json({ signals });
}
