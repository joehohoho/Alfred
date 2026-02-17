import { NextResponse } from 'next/server';
import { runSignalPipeline } from '@/services/pipeline/runPipeline';

export async function POST() {
  const signals = await runSignalPipeline();
  return NextResponse.json({ ok: true, count: signals.length, signals });
}
