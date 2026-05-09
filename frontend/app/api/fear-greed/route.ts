import { NextResponse } from 'next/server';

const MOCK = {
  isMock: true,
  value: 55,
  label: 'Greed',
  previousClose: 52,
  weekAgo: 48,
  monthAgo: 61,
};

export async function GET() {
  try {
    const resp = await fetch(
      'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Referer': 'https://edition.cnn.com/',
        },
        next: { revalidate: 3600 },
      },
    );
    if (!resp.ok) return NextResponse.json(MOCK);
    const data = await resp.json() as { fear_and_greed?: { score?: number; rating?: string; previous_close?: number; previous_1_week?: number; previous_1_month?: number } };
    const fg = data?.fear_and_greed;
    if (!fg?.score) return NextResponse.json(MOCK);
    return NextResponse.json({
      isMock: false,
      value: Math.round(fg.score),
      label: fg.rating ?? '',
      previousClose: fg.previous_close,
      weekAgo: fg.previous_1_week,
      monthAgo: fg.previous_1_month,
    });
  } catch {
    return NextResponse.json(MOCK);
  }
}
