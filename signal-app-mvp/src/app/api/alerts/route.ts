import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    alerts: [],
    message: 'Alerts API disabled in demo mode.'
  });
}

export async function POST() {
  return NextResponse.json({ 
    ok: true,
    message: 'Alert subscription disabled in demo mode.'
  });
}
