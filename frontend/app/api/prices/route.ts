import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ isMock: true, stocks: {}, indices: {}, updatedAt: null });
}
