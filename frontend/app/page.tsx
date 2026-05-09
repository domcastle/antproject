
'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  STOCKS, MARKET_INDICES, FEAR_GREED, BUFFETT, CALENDAR_EVENTS,
  getFearGreedEmoji, calcSilhouetteZone,
} from '@/lib/mockData';
import useSWR from 'swr';
import { fetchStockList, SWR_POLL } from '@/lib/api';
import FearGreedGauge from '@/components/FearGreedGauge';
import BuffettGauge from '@/components/BuffettGauge';
import StockCard from '@/components/StockCard';
import StockCardSkeleton from '@/components/StockCardSkeleton';
import ExchangeTicker from '@/components/ExchangeTicker';

const TABS = ['전체', '국내 KOSPI', '미국 M7'];

const BUFFETT_M7_MOCK: { code: string; name: string; beta: number }[] = [
  { code: 'AAPL',  name: 'Apple',     beta: 1.2 },
  { code: 'MSFT',  name: 'Microsoft', beta: 0.9 },
  { code: 'GOOGL', name: 'Alphabet',  beta: 1.1 },
  { code: 'AMZN',  name: 'Amazon',    beta: 1.3 },
  { code: 'META',  name: 'Meta',      beta: 1.4 },
  { code: 'NVDA',  name: 'NVIDIA',    beta: 1.8 },
  { code: 'TSLA',  name: 'Tesla',     beta: 2.1 },
];

const MOCK_FEAR_GREED_KR = {
  score: 45,
  status: 'neutral',
  market: 'KR',
  components: { vkospi: 52, momentum: 48, stock_strength: 46, trend: 44, kosdaq: 42, safe_asset: 40 },
};

export default function HomePage() {
  const [activeTab, setActiveTab]         = useState('전체');
  const [fearGreedTab, setFearGreedTab]   = useState<'국내' | '미국'>('미국');
  const [liveFearGreedUS, setLiveFearGreedUS] = useState<any>(null);
  const [liveFearGreedKR, setLiveFearGreedKR] = useState<any>(null);

  // Yahoo Finance 경유 (기존 Next.js API route)
  const [yfStocks, setYfStocks]     = useState<Record<string, any>>({});
  const [yfIndices, setYfIndices]   = useState<Record<string, any>>({});
  const [yfIsLive, setYfIsLive]     = useState(false);
  const [updatedAt, setUpdatedAt]   = useState<string | null>(null);

  // FastAPI 직접 연동
  const [apiIndices, setApiIndices]     = useState<Record<string, any>>({});  // code → {current, change_pct, sparkline}
  const [apiMacro, setApiMacro]         = useState<{ m7_betas: { code: string; name: string; beta: number }[] } | null>(null);

  const { data: stockListRaw, isLoading: isStockListLoading } = useSWR<Array<{ code: string; price: number; change_pct: number; zone: number }>>(
    'stock-list',
    () => fetchStockList().then(r => r.json()),
    SWR_POLL,
  );
  const apiStockList = useMemo(() => {
    const map: Record<string, any> = {};
    stockListRaw?.forEach(d => { map[d.code] = d; });
    return map;
  }, [stockListRaw]);

  useEffect(() => {
    // ① Yahoo Finance 현재가 (Next.js 로컬 route)
    fetch('/api/prices')
      .then(r => r.json())
      .then(data => {
        if (!data.isMock && Object.keys(data.stocks).length > 0) {
          setYfStocks(data.stocks);
          setYfIndices(data.indices);
          setYfIsLive(true);
          setUpdatedAt(data.updatedAt);
        }
      })
      .catch(() => {});

    // ② 미국 공탐 (Next.js 로컬 route → CNN)
    fetch('/api/fear-greed')
      .then(r => r.json())
      .then(data => { if (!data.isMock) setLiveFearGreedUS(data); })
      .catch(() => {});

    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;

    // ③ 국내 공탐 (FastAPI)
    fetch(`${base}/api/market/fear-greed/kr`)
      .then(r => r.json())
      .then(data => { if (data.score !== undefined) setLiveFearGreedKR(data); })
      .catch(() => {});

    // ④ 지수 (FastAPI) — [{code, current, change_pct, sparkline}]
    fetch(`${base}/api/market/indices`)
      .then(r => r.json())
      .then((data: Array<{ code: string; current: number; change_pct: number; sparkline: number[] }>) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, any> = {};
        data.forEach(d => { map[d.code] = d; });
        setApiIndices(map);
      })
      .catch(() => {});

    // ⑥ 매크로 (FastAPI) — {buffett_index, buffett_status, m7_betas[]}
    fetch(`${base}/api/market/macro`)
      .then(r => r.json())
      .then(data => { if (data.m7_betas) setApiMacro(data); })
      .catch(() => {});
  }, []);

  // ── 지수 병합: FastAPI > Yahoo Finance > mock ──────────────────────────
  const mergedIndices = MARKET_INDICES.map(idx => {
    const api = apiIndices[idx.name];
    if (api) {
      const change = Math.round(api.current * api.change_pct / 100 * 100) / 100;
      return { ...idx, value: api.current, change, changePct: api.change_pct, sparkline: api.sparkline ?? idx.sparkline };
    }
    const yf = yfIndices[idx.name];
    if (yf) return { ...idx, value: yf.value, change: yf.change, changePct: yf.changePct };
    return idx;
  });

  // ── 종목 병합: Yahoo Finance > FastAPI > mock ──────────────────────────
  const mergedStocks = STOCKS.map(s => {
    const yf  = yfStocks[s.code];
    const api = apiStockList[s.code];

    const price     = yf?.price     ?? api?.price     ?? s.price;
    const changePct = yf?.changePct ?? (api?.change_pct !== undefined ? api.change_pct : s.changePct);
    const high52    = yf?.high52    ?? s.high52;
    const low52     = yf?.low52     ?? s.low52;
    const change    = yf?.change    ?? Math.round(price * changePct / 100 * 10) / 10;
    const per       = yf?.per       ?? s.per;
    const pbr       = yf?.pbr       ?? s.pbr;

    const { zone, signal, pct } = calcSilhouetteZone(price, low52, high52);

    return {
      ...s,
      price, change, changePct, high52, low52, per, pbr,
      silhouetteZone: (api?.zone && api.zone !== 3) ? api.zone : zone,
      silhouetteSignal: signal,
      silhouettePct: Math.round(pct),
    };
  });

  // ── 공탐 데이터 결정 ───────────────────────────────────────────────────
  const fearGreedUS     = liveFearGreedUS ?? FEAR_GREED;
  const fearGreedKR     = liveFearGreedKR ?? MOCK_FEAR_GREED_KR;
  const activeFearGreed = fearGreedTab === '미국' ? fearGreedUS : fearGreedKR;
  const fearScore       = (activeFearGreed as any).value ?? (activeFearGreed as any).score ?? 50;
  const fearEmoji       = getFearGreedEmoji(fearScore);
  const isLive          = yfIsLive || Object.keys(apiIndices).length > 0;

  // ── 경고 배너 ──────────────────────────────────────────────────────────
  const warnings: string[] = [];
  if (fearScore < 20) warnings.push('시장이 극도로 공포 상태입니다. 과도한 투자 결정 주의');
  if (fearScore > 80) warnings.push('시장이 극도로 과열 상태입니다. 고점 매수 주의');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  CALENDAR_EVENTS.filter(e => e.type === 'witching').forEach(e => {
    const diff = Math.round((new Date(e.date).getTime() - today.getTime()) / 86400000);
    if (Math.abs(diff) <= 3) warnings.push(`선물/옵션 만기일(${e.date}) 근접 — 변동성 주의`);
  });

  const filteredStocks = mergedStocks.filter(s => {
    if (activeTab === '국내 KOSPI') return s.market === 'KR';
    if (activeTab === '미국 M7')   return s.market === 'US';
    return true;
  });

  return (
    <div className="min-h-screen">
      {warnings.map((w, i) => (
        <div key={i} className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-amber-400 text-xs">
          ⚠️ {w}
        </div>
      ))}

      {/* Navigation */}
      <nav className="border-b border-[#1e2330] bg-[#0a0d14]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🐜</div>
            <div>
              <div className="text-base font-extrabold text-white">Ant Insight</div>
              <div className="text-[10px] text-gray-500">개미인사이트 · 월간 해커톤 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/calendar" className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#1e2330] transition-colors">
              📅 개미의 달력
            </Link>
            <div className="text-[10px] text-gray-500 border border-[#1e2330] rounded-lg px-2 py-1">
              준실시간 (15분 지연)
            </div>
          </div>
        </div>
      </nav>

      {/* 환율 티커 */}
      <ExchangeTicker />

      {/* 배경 그라데이션 — 공탐 점수 연동 */}
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: fearScore <= 45
            ? 'radial-gradient(ellipse 60% 40% at 20% 30%, #1565C015 0%, transparent 70%)'
            : fearScore <= 55
            ? 'radial-gradient(ellipse 60% 40% at 20% 30%, #FAFAFA08 0%, transparent 70%)'
            : 'radial-gradient(ellipse 60% 40% at 20% 30%, #FF8C4212 0%, transparent 70%)',
        }} />

        <div className="max-w-7xl mx-auto px-4 py-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">

            {/* ── 공포 & 탐욕 카드 ── */}
            <div className="bg-[#0f1117] border border-[#1e2330] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">😱→🤑</span>
                <div>
                  <div className="text-sm font-bold text-white">공포 & 탐욕 지수</div>
                  <div className="text-[10px] text-gray-500">
                    {fearGreedTab === '미국' ? 'CNN Fear & Greed' : 'KOSPI200 실현변동성 기반'}
                  </div>
                </div>
                <div className="ml-auto text-2xl">{fearEmoji}</div>
              </div>

              <div className="flex bg-[#0a0d14] border border-[#1e2330] rounded-xl overflow-hidden mb-4 w-fit">
                {(['미국', '국내'] as const).map(tab => (
                  <button key={tab} onClick={() => setFearGreedTab(tab)}
                    className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                      fearGreedTab === tab ? 'bg-[#3182F6] text-white' : 'text-gray-400 hover:text-white'
                    }`}>
                    {tab === '미국' ? '🇺🇸 미국' : '🇰🇷 국내'}
                  </button>
                ))}
              </div>

              <FearGreedGauge
                value={fearScore}
                label={(activeFearGreed as any).label ?? (activeFearGreed as any).status ?? ''}
                previousClose={(activeFearGreed as any).previousClose}
                weekAgo={(activeFearGreed as any).weekAgo}
                monthAgo={(activeFearGreed as any).monthAgo}
              />

              {fearGreedTab === '국내' && fearGreedKR.components && (
                <div className="mt-3 space-y-1">
                  {[
                    { key: 'vkospi',         label: 'VKOSPI(대체)' },
                    { key: 'momentum',       label: '모멘텀'        },
                    { key: 'stock_strength', label: '주가강도'       },
                    { key: 'trend',          label: '추세'          },
                    { key: 'kosdaq',         label: 'KOSDAQ'       },
                    { key: 'safe_asset',     label: '안전자산'       },
                  ].map(({ key, label }) => {
                    const val   = fearGreedKR.components[key] as number;
                    const color = val < 40 ? '#3182F6' : val < 60 ? '#8B95A1' : '#FF4D4D';
                    return (
                      <div key={key} className="flex items-center gap-2 text-[10px]">
                        <span className="text-gray-500 w-20 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 bg-[#1e2330] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-gray-400 w-7 text-right">{val}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 text-[10px] text-gray-500">
                현재 시장은{' '}
                <span className="text-orange-400 font-semibold">
                  {(activeFearGreed as any).label ?? (activeFearGreed as any).status ?? ''}
                </span>{' '}
                구간 — 투자 결정 시 냉정함을 유지하세요
              </div>
              {fearGreedTab === '미국' && !liveFearGreedUS && (
                <div className="text-[9px] text-yellow-600 mt-1">⚠ Mock 데이터 표시 중</div>
              )}
              {fearGreedTab === '국내' && !liveFearGreedKR && (
                <div className="text-[9px] text-yellow-600 mt-1">⚠ 백엔드 미연결 — Mock 표시 중</div>
              )}
            </div>

            {/* ── 주요 지수 카드 ── */}
            <div className="bg-[#0f1117] border border-[#1e2330] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📊</span>
                <div className="text-sm font-bold text-white">주요 지수</div>
                <div className="ml-auto text-[10px] text-gray-500">
                  {Object.keys(apiIndices).length > 0 ? '● FastAPI 연결됨' : '15분 지연'}
                </div>
              </div>
              <div className="space-y-3">
                {mergedIndices.map(idx => {
                  const isUp = idx.changePct >= 0;
                  return (
                    <div key={idx.name} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white">{idx.name}</div>
                        <div className="text-sm font-bold text-gray-200">
                          {idx.value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}
                        </div>
                      </div>
                      <div className="flex items-end gap-0.5 mx-3">
                        {idx.sparkline.map((v: number, i: number) => {
                          const min = Math.min(...idx.sparkline);
                          const max = Math.max(...idx.sparkline);
                          const h   = Math.max(3, ((v - min) / (max - min + 0.01)) * 20 + 3);
                          return (
                            <div key={i} className="w-1.5 rounded-sm" style={{
                              height: h,
                              backgroundColor: isUp ? '#FF4D4D' : '#3182F6',
                              opacity: i === idx.sparkline.length - 1 ? 1 : 0.5,
                            }} />
                          );
                        })}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold" style={{ color: isUp ? '#FF4D4D' : '#3182F6' }}>
                          {isUp ? '+' : ''}{idx.changePct.toFixed(2)}%
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {isUp ? '+' : ''}{idx.change.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 버핏 지수 카드 ── */}
            <div className="bg-[#0f1117] border border-[#1e2330] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🦁</span>
                <div>
                  <div className="text-sm font-bold text-white">버핏 지수</div>
                  <div className="text-[10px] text-gray-500">시가총액 / GDP × 100%</div>
                </div>
              </div>
              <BuffettGauge usValue={BUFFETT.us} krValue={BUFFETT.kr} />

              {/* M7 베타 리스트 */}
              <div className="mt-4 pt-4 border-t border-[#1e2330]">
                <div className="text-[10px] text-gray-500 mb-2">
                  M7 베타 {apiMacro ? <span className="text-green-600">● Live</span> : <span className="text-yellow-600">Mock</span>}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(apiMacro?.m7_betas ?? BUFFETT_M7_MOCK).map(({ code, name, beta }: { code: string; name: string; beta: number }) => {
                    const color = beta >= 1.5 ? '#FF4D4D' : beta < 0.8 ? '#3182F6' : '#8B95A1';
                    return (
                      <div key={code} className="text-center p-1.5 rounded-lg bg-[#0a0d14]">
                        <div className="text-[9px] text-gray-500 truncate">{name.split(' ')[0]}</div>
                        <div className="text-xs font-bold mt-0.5" style={{ color }}>β{beta.toFixed(1)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-2 text-[9px] text-gray-600">
                  <span style={{ color: '#3182F6' }}>■ β{'<'}0.8 저변동</span>
                  <span style={{ color: '#8B95A1' }}>■ 시장동행</span>
                  <span style={{ color: '#FF4D4D' }}>■ β≥1.5 고변동</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 종목 리스트 ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-white">📈 종목 분석</h2>
                <div className="text-[10px] text-gray-500 bg-[#1e2330] px-2 py-1 rounded hidden sm:block">
                  실루엣 위치 = 52주 가격 위치 · hover로 빠른 분석
                </div>
              </div>
              <div className="flex bg-[#0f1117] border border-[#1e2330] rounded-xl overflow-hidden">
                {TABS.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === tab ? 'bg-[#3182F6] text-white' : 'text-gray-400 hover:text-white'
                    }`}>{tab}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { z: 1, l: '발바닥~발목', c: '#3182F6', s: '강한 매수' },
                { z: 2, l: '발목~무릎',  c: '#54B8FF', s: '매수 고려' },
                { z: 3, l: '무릎~허리',  c: '#8B95A1', s: '중립'     },
                { z: 4, l: '허리~어깨',  c: '#FF8C42', s: '매도 고려' },
                { z: 5, l: '어깨~머리',  c: '#FF4D4D', s: '강한 경고' },
              ].map(({ z, l, c, s }) => (
                <div key={z} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                  <span className="text-gray-300">{l}</span>
                  <span className="text-gray-600">({s})</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {isStockListLoading
                ? Array.from({ length: 8 }).map((_, i) => <StockCardSkeleton key={i} />)
                : filteredStocks.map(stock => <StockCard key={stock.code} stock={stock} />)
              }
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-gray-600 border-t border-[#1e2330] pt-4">
            {isLive
              ? <span className="text-green-600">● 실시간 데이터{updatedAt ? ` · ${new Date(updatedAt).toLocaleTimeString('ko-KR')} 갱신` : ''}</span>
              : <span className="text-yellow-600">⚠ Mock 데이터 표시 중</span>
            }
            {' '}· 준실시간(15분 지연) · 이 서비스의 분석 내용은 투자 권유가 아닙니다
          </div>
        </div>
      </div>
    </div>
  );
}
