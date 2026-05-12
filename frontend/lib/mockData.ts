import type { EventType } from '@/lib/types';

export type MarketType = 'KR' | 'US';
export type SilhouetteZone = 1 | 2 | 3 | 4 | 5;

export interface StockData {
  code: string;
  name: string;
  market: MarketType;
  price: number;
  change: number;
  changePct: number;
  high52: number;
  low52: number;
  per: number | null;
  pbr: number | null;
}

export interface IndexData {
  name: string;
  value: number;
  change: number;
  changePct: number;
  sparkline: number[];
}

export interface CalendarEventData {
  date: string;
  type: EventType;
  title: string;
  badge_color: string;
  description?: string;
}

export const STOCKS: StockData[] = [
  { code: '005930', name: '삼성전자',  market: 'KR', price: 62500,  change: 750,   changePct:  1.22, high52: 78800,  low52: 52000,  per: 15.2, pbr: 1.3  },
  { code: '000660', name: 'SK하이닉스', market: 'KR', price: 185000, change: 1000,  changePct:  0.54, high52: 220000, low52: 130000, per: 12.8, pbr: 2.1  },
  { code: '035420', name: 'NAVER',      market: 'KR', price: 198000, change: -1000, changePct: -0.50, high52: 240000, low52: 168000, per: 22.4, pbr: 1.8  },
  { code: '005380', name: '현대차',     market: 'KR', price: 225000, change: 2000,  changePct:  0.89, high52: 268000, low52: 188000, per: 8.5,  pbr: 0.8  },
  { code: '051910', name: 'LG화학',     market: 'KR', price: 412000, change: -5000, changePct: -1.20, high52: 520000, low52: 350000, per: 18.1, pbr: 1.4  },
  { code: 'AAPL',   name: 'Apple',      market: 'US', price: 182.5,  change: 0.60,  changePct:  0.33, high52: 198.2,  low52: 143.5,  per: 28.4, pbr: 45.2 },
  { code: 'MSFT',   name: 'Microsoft',  market: 'US', price: 415.2,  change: 2.70,  changePct:  0.65, high52: 450.0,  low52: 310.0,  per: 32.1, pbr: 12.8 },
  { code: 'GOOGL',  name: 'Alphabet',   market: 'US', price: 173.8,  change: -0.38, changePct: -0.22, high52: 192.0,  low52: 120.5,  per: 24.6, pbr: 6.2  },
  { code: 'AMZN',   name: 'Amazon',     market: 'US', price: 186.4,  change: 1.94,  changePct:  1.05, high52: 212.0,  low52: 118.0,  per: 45.2, pbr: 8.9  },
  { code: 'META',   name: 'Meta',        market: 'US', price: 478.9,  change: 3.72,  changePct:  0.78, high52: 550.0,  low52: 274.4,  per: 22.3, pbr: 7.4  },
  { code: 'NVDA',   name: 'NVIDIA',     market: 'US', price: 875.3,  change: 18.43, changePct:  2.15, high52: 950.0,  low52: 400.0,  per: 65.4, pbr: 32.1 },
  { code: 'TSLA',   name: 'Tesla',      market: 'US', price: 175.6,  change: -2.41, changePct: -1.35, high52: 278.9,  low52: 138.8,  per: 52.8, pbr: 9.1  },
];

export const MARKET_INDICES: IndexData[] = [
  { name: 'KOSPI',  value: 2651.5,  change: 9.2,  changePct: 0.35, sparkline: [2580, 2585, 2590, 2598, 2602, 2598, 2610, 2622, 2638, 2651] },
  { name: 'KOSDAQ', value: 851.2,   change: 4.4,  changePct: 0.52, sparkline: [828, 830, 832, 833, 832, 836, 840, 844, 848, 851] },
  { name: 'S&P500', value: 5201.3,  change: 10.9, changePct: 0.21, sparkline: [5120, 5132, 5140, 5150, 5145, 5158, 5165, 5178, 5190, 5201] },
  { name: 'NASDAQ', value: 16802.5, change: 30.2, changePct: 0.18, sparkline: [16500, 16535, 16560, 16592, 16572, 16605, 16650, 16705, 16760, 16802] },
];

export const FEAR_GREED = {
  value: 55,
  label: 'Greed',
  previousClose: 52,
  weekAgo: 48,
  monthAgo: 61,
};

export const BUFFETT = {
  us: 105.3,
  kr: 92.4,
};

export const CALENDAR_EVENTS: CalendarEventData[] = [
  { date: '2026-05-06', type: 'rate',     title: 'FOMC 금리 결정',    badge_color: '#fef3c7' },
  { date: '2026-05-13', type: 'cpi',      title: '미국 CPI 발표',     badge_color: '#fef9c3' },
  { date: '2026-05-15', type: 'witching', title: '트리플 위칭데이',    badge_color: '#fee2e2' },
  { date: '2026-06-10', type: 'earnings', title: '애플 실적 발표',    badge_color: '#dbeafe' },
  { date: '2026-06-17', type: 'rate',     title: 'FOMC 금리 결정',    badge_color: '#fef3c7' },
  { date: '2026-06-19', type: 'witching', title: '쿼드러플 위칭데이',  badge_color: '#fee2e2' },
  { date: '2026-09-18', type: 'witching', title: '쿼드러플 위칭데이',  badge_color: '#fee2e2' },
  { date: '2026-12-18', type: 'witching', title: '쿼드러플 위칭데이',  badge_color: '#fee2e2' },
];

export function getFearGreedEmoji(score: number): string {
  if (score <= 20) return '😱';
  if (score <= 40) return '😟';
  if (score <= 60) return '😐';
  if (score <= 80) return '😊';
  return '🤑';
}

export function calcSilhouetteZone(
  price: number,
  low52: number,
  high52: number,
): { zone: SilhouetteZone; signal: string; pct: number } {
  const range = high52 - low52;
  const pct = range > 0 ? ((price - low52) / range) * 100 : 50;
  if (pct <= 20) return { zone: 1, signal: '강한 매수', pct };
  if (pct <= 40) return { zone: 2, signal: '매수 고려', pct };
  if (pct <= 60) return { zone: 3, signal: '중립',      pct };
  if (pct <= 80) return { zone: 4, signal: '매도 고려', pct };
  return              { zone: 5, signal: '강한 경고', pct };
}
