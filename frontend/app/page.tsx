'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  STOCKS, MARKET_INDICES, FEAR_GREED, BUFFETT, CALENDAR_EVENTS,
  calcSilhouetteZone,
} from '@/lib/mockData';
import { fetchStockList, SWR_POLL } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import ExchangeTicker from '@/components/ExchangeTicker';
import FearGreedGauge from '@/components/FearGreedGauge';
import BuffettGauge from '@/components/BuffettGauge';
import IndexCard from '@/components/IndexCard';
import M7Card from '@/components/M7Card';
import StockListTable from '@/components/StockListTable';
import SectionTitle from '@/components/SectionTitle';

const BUFFETT_M7_MOCK = [
  { code: 'AAPL', name: 'Apple',     beta: 1.24 },
  { code: 'MSFT', name: 'Microsoft', beta: 0.93 },
  { code: 'GOOGL',name: 'Alphabet',  beta: 1.05 },
  { code: 'AMZN', name: 'Amazon',    beta: 1.31 },
  { code: 'NVDA', name: 'Nvidia',    beta: 1.78 },
  { code: 'META', name: 'Meta',      beta: 1.42 },
  { code: 'TSLA', name: 'Tesla',     beta: 2.06 },
];

const MOCK_FEAR_GREED_KR = {
  score: 38, status: 'fear', market: 'KR',
  components: { vkospi: 42, momentum: 38, stock_strength: 36, trend: 35, kosdaq: 40, safe_asset: 32 },
};

export default function HomePage() {
  const [fearGreedTab, setFearGreedTab] = useState<'KR' | 'US'>('KR');
  const [stockTab, setStockTab] = useState<'all' | 'KR' | 'US'>('all');
  const [liveFearGreedUS, setLiveFearGreedUS] = useState<any>(null);
  const [liveFearGreedKR, setLiveFearGreedKR] = useState<any>(null);
  const [yfStocks, setYfStocks] = useState<Record<string, any>>({});
  const [yfIndices, setYfIndices] = useState<Record<string, any>>({});
  const [apiIndices, setApiIndices] = useState<Record<string, any>>({});
  const [apiMacro, setApiMacro] = useState<{ buffett_index?: number; m7_betas: any[] } | null>(null);

  const { data: stockListRaw } = useSWR<any[]>(
    'stock-list', () => fetchStockList().then(r => r.json()), SWR_POLL,
  );
  const apiStockList = useMemo(() => {
    const m: Record<string, any> = {};
    stockListRaw?.forEach(d => { m[d.code] = d; });
    return m;
  }, [stockListRaw]);

  useEffect(() => {
    fetch('/api/prices').then(r => r.json()).then(d => {
      if (!d.isMock && d.stocks) { setYfStocks(d.stocks); setYfIndices(d.indices); }
    }).catch(() => {});
    fetch('/api/fear-greed').then(r => r.json()).then(d => {
      if (!d.isMock) setLiveFearGreedUS(d);
    }).catch(() => {});
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;
    fetch(`${base}/api/market/fear-greed/kr`).then(r => r.json()).then(d => {
      if (d.score !== undefined) setLiveFearGreedKR(d);
    }).catch(() => {});
    fetch(`${base}/api/market/indices`).then(r => r.json()).then((d: any[]) => {
      if (Array.isArray(d)) {
        const m: Record<string, any> = {};
        d.forEach(x => { m[x.code] = x; });
        setApiIndices(m);
      }
    }).catch(() => {});
    fetch(`${base}/api/market/macro`).then(r => r.json()).then(d => {
      if (d.m7_betas) setApiMacro(d);
    }).catch(() => {});
  }, []);

  const mergedIndices = MARKET_INDICES.map(idx => {
    const api = apiIndices[idx.name];
    if (api) return { ...idx, value: api.current, change: Math.round(api.current * api.change_pct/100*100)/100, changePct: api.change_pct, sparkline: api.sparkline ?? idx.sparkline };
    const yf = yfIndices[idx.name];
    if (yf) return { ...idx, value: yf.value, change: yf.change, changePct: yf.changePct };
    return idx;
  });

  const mergedStocks = STOCKS.map(s => {
    const yf = yfStocks[s.code]; const api = apiStockList[s.code];
    const price = yf?.price ?? api?.price ?? s.price;
    const changePct = yf?.changePct ?? (api?.change_pct !== undefined ? api.change_pct : s.changePct);
    const high52 = yf?.high52 ?? s.high52; const low52 = yf?.low52 ?? s.low52;
    const change = yf?.change ?? Math.round(price*changePct/100*10)/10;
    const per = yf?.per ?? s.per; const pbr = yf?.pbr ?? s.pbr;
    const { zone, signal, pct } = calcSilhouetteZone(price, low52, high52);
    return {
      ...s, price, change, changePct, high52, low52, per, pbr,
      silhouetteZone: (api?.zone && api.zone !== 3) ? api.zone : zone,
      silhouetteSignal: signal,
      silhouettePct: Math.round(pct),
    };
  });

  const fearGreedUS = liveFearGreedUS ?? { score: FEAR_GREED.value, status: 'greed', market: 'US' };
  const fearGreedKR = liveFearGreedKR ?? MOCK_FEAR_GREED_KR;
  const activeFG = fearGreedTab === 'US' ? fearGreedUS : fearGreedKR;
  const fearScore = (activeFG as any).value ?? (activeFG as any).score ?? 50;
  const fearStatus = (activeFG as any).label ?? (activeFG as any).status ?? '';

  const filteredStocks = mergedStocks.filter(s => {
    if (stockTab === 'KR') return s.market === 'KR';
    if (stockTab === 'US') return s.market === 'US';
    return true;
  });

  const buffettVal = apiMacro?.buffett_index ?? BUFFETT.us;
  const buffettStatus = buffettVal >= 150 ? 'bubble' : buffettVal >= 100 ? 'overvalued' : buffettVal >= 70 ? 'neutral' : 'undervalued';

  return (
    <div className="flex min-h-screen">
      <Sidebar active="home" />
      <main className="flex-1 overflow-x-hidden">
        <ExchangeTicker />
        <div className="px-10 py-8 max-w-[1400px] mx-auto">
          {/* Page heading */}
          <div className="mb-6">
            <div className="kicker mb-2">Market Overview</div>
            <h1 className="headline text-3xl text-fg">시장 요약</h1>
          </div>

          {/* Indices */}
          <SectionTitle kicker="Indices" title="주요 지수" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {mergedIndices.map(idx => <IndexCard key={idx.name} idx={idx} />)}
          </div>
          <div className="plain-help mb-8">
            오늘은 <b>국내는 약하고 미국은 강한</b> 흐름이에요. 엇갈린 분위기에선 한쪽에 베팅하기보다,{' '}
            <b>두 시장에 나눠 담아 두는 전략</b>이 안전해요.
          </div>

          {/* Fear & Greed + Buffett */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
            <div className="card lg:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <SectionTitle kicker="Sentiment" title="공포 & 탐욕 지수" inline />
                <div className="flex bg-bg-3 border border-line rounded-lg overflow-hidden">
                  {(['KR', 'US'] as const).map(t => (
                    <button key={t} onClick={() => setFearGreedTab(t)}
                      className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                        fearGreedTab === t ? 'bg-accent text-bg' : 'text-fg-2 hover:text-fg'
                      }`}>
                      {t === 'KR' ? '🇰🇷 국내' : '🇺🇸 미국'}
                    </button>
                  ))}
                </div>
              </div>
              <FearGreedGauge
                score={fearScore}
                label={fearStatus}
                market={fearGreedTab}
                components={fearGreedTab === 'KR' ? fearGreedKR.components : null}
              />
              <div className="plain-help mt-4">
                {fearGreedTab === 'KR'
                  ? <>지금 국내 시장은 <b>공포 구간</b>이에요. 투자자들이 겁을 내고 있어, 좋은 종목을 <b>싸게 살 기회</b>가 될 수 있어요. 한 번에 몰빵하기보다 나눠서 천천히 들어가 보세요.</>
                  : <>미국 시장은 <b>탐욕 구간</b>이에요. 분위기가 좋아 사람들이 적극적으로 매수 중이지만, <b>단기 과열</b> 신호이기도 해요. 새로 큰 비중으로 들어가긴 부담스러워요.</>}
              </div>
            </div>
            <div className="card lg:col-span-2">
              <SectionTitle kicker="Valuation" title="버핏 지수" />
              <BuffettGauge value={buffettVal} status={buffettStatus} />
              <div className="plain-help mt-5">
                시장 전체가 <b style={{ color: '#ff7777' }}>많이 비싸진 상태</b>예요.
                과거 같은 수치 이후엔 조정이 자주 있었어요. <b>새로 크게 들어가긴 부담스럽고</b>,
                가진 종목은 분산해서 위험을 나눠두는 게 좋아요.
              </div>
            </div>
          </div>

          {/* M7 betas */}
          <div className="mb-8">
            <M7Card betas={apiMacro?.m7_betas ?? BUFFETT_M7_MOCK} live={!!apiMacro} />
          </div>

          {/* Stock list */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle kicker="Stocks" title="종목 분석" inline />
              <div className="flex bg-bg-3 border border-line rounded-lg overflow-hidden">
                {([['all','전체'], ['KR','국내'], ['US','미국']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setStockTab(k)}
                    className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                      stockTab === k ? 'bg-accent text-bg' : 'text-fg-2 hover:text-fg'
                    }`}>{l}</button>
                ))}
              </div>
            </div>
            <StockListTable stocks={filteredStocks} />
          </div>
        </div>
      </main>
    </div>
  );
}
