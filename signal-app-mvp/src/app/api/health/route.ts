import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple health check - just return OK
    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: String(error) },
      { status: 500 }
    );
  }
}
