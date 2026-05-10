'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  STOCKS, MARKET_INDICES, FEAR_GREED, BUFFETT, CALENDAR_EVENTS,
  calcSilhouetteZone,
} from '@/lib/mockData';
import { fetchStockList, fetchMarketInsight, SWR_POLL } from '@/lib/api';
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
  const [marketInsight, setMarketInsight] = useState<{
    indices_summary: string;
    fear_greed_kr: string;
    fear_greed_us: string;
    buffett: string;
  } | null>(null);

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

  useEffect(() => {
    const fgKR  = liveFearGreedKR ?? MOCK_FEAR_GREED_KR;
    const fgUS  = liveFearGreedUS ?? { score: FEAR_GREED.value, status: 'greed' };
    const bVal  = apiMacro?.buffett_index ?? BUFFETT.us;
    const bStat = bVal >= 150 ? 'bubble' : bVal >= 100 ? 'overvalued' : bVal >= 70 ? 'neutral' : 'undervalued';
    const idxPayload = MARKET_INDICES.map(idx => {
      const api = (apiIndices as any)[idx.name];
      return {
        name: idx.name,
        value: api?.current ?? idx.value,
        change_pct: api?.change_pct ?? idx.changePct,
      };
    });
    fetchMarketInsight({
      indices: idxPayload,
      fear_greed_kr: { score: (fgKR as any).score ?? 50, status: (fgKR as any).status ?? '' },
      fear_greed_us: { score: (fgUS as any).score ?? (fgUS as any).value ?? 50, status: (fgUS as any).status ?? (fgUS as any).label ?? '' },
      buffett: { value: bVal, status: bStat },
    })
      .then(r => r.json())
      .then(d => { if (d.indices_summary) setMarketInsight(d); })
      .catch(() => {});
  }, [liveFearGreedKR, liveFearGreedUS, apiMacro, apiIndices]);

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

  // ── 주요 지수 plain-help ────────────────────────────────────────────
  const krAvgChange = (() => {
    const kr = mergedIndices.filter(i => i.name === 'KOSPI' || i.name === 'KOSDAQ');
    return kr.length ? kr.reduce((s, i) => s + ((i as any).changePct ?? 0), 0) / kr.length : 0;
  })();
  const usAvgChange = (() => {
    const us = mergedIndices.filter(i => i.name === 'S&P500' || i.name === 'NASDAQ');
    return us.length ? us.reduce((s, i) => s + ((i as any).changePct ?? 0), 0) / us.length : 0;
  })();
  const indicesHelpText =
    krAvgChange > 0 && usAvgChange > 0
      ? <><b>국내외 시장 모두 상승</b>하고 있어요. 위험선호 분위기이니 보유 종목은 유지하고, 관심 종목 비중을 조금씩 늘려볼 만해요.</>
      : krAvgChange <= 0 && usAvgChange <= 0
        ? <>국내외 시장 <b>모두 약세</b>예요. 신규 진입보다 현금 비중을 높이거나 <b>방어적 포지션</b>을 유지하는 게 안전해요.</>
        : krAvgChange > usAvgChange
          ? <>오늘은 <b>국내가 미국보다 강한</b> 흐름이에요. 국내 우량주 비중을 우선 검토하고, 미국은 비중 조절을 고려해 보세요.</>
          : <>오늘은 <b>미국이 국내보다 강한</b> 흐름이에요. 엇갈린 분위기에선 한쪽에 베팅하기보다 <b>두 시장에 나눠 담아두는 전략</b>이 안전해요.</>;

  // ── 공포 & 탐욕 plain-help ──────────────────────────────────────────
  const krStatus = (fearGreedKR as any).status ?? '';
  const usStatus = (fearGreedUS as any).status ?? (fearGreedUS as any).label ?? '';
  const fearGreedKRHelpText =
    krStatus === 'extreme_fear'
      ? <>국내 시장이 <b>극도의 공포</b> 상태예요. 패닉 매도가 나올 수 있지만, 장기적으로 바닥 근처일 가능성도 있어요. <b>분할 매수</b>를 천천히 고려해볼 타이밍이에요.</>
      : krStatus === 'fear'
        ? <>국내 시장에 <b>공포 심리</b>가 퍼져 있어요. 좋은 종목을 <b>싸게 살 기회</b>가 될 수 있어요. 한 번에 몰빵하기보다 나눠서 천천히 들어가 보세요.</>
        : krStatus === 'greed'
          ? <>국내 시장에 <b>탐욕 분위기</b>가 형성되고 있어요. 상승세가 이어질 수 있지만, <b>신규 진입은 신중</b>하게 접근하는 게 좋아요.</>
          : krStatus === 'extreme_greed'
            ? <>국내 시장이 <b>극도의 탐욕</b> 상태예요. 단기 과열 신호이므로 새로 큰 비중으로 들어가긴 부담스럽고, <b>보유 종목 일부 익절</b>을 검토해볼 시점이에요.</>
            : <>국내 시장은 <b>중립 구간</b>이에요. 뚜렷한 방향성이 없는 시기엔 관망하거나, 이미 보유한 종목 위주로 관리하는 게 좋아요.</>;
  const fearGreedUSHelpText =
    usStatus === 'extreme_fear'
      ? <>미국 시장이 <b>극도의 공포</b> 상태예요. 역사적으로 이 구간 이후 반등이 나왔지만, 변동성이 크니 <b>한 번에 큰 비중은 위험</b>해요.</>
      : usStatus === 'fear'
        ? <>미국 시장에 <b>공포 심리</b>가 감돌아요. 상대적으로 저렴하게 살 기회이지만, 하락이 더 이어질 수 있어 <b>분할 매수 전략</b>이 유효해요.</>
        : usStatus === 'greed'
          ? <>미국 시장에 <b>탐욕 분위기</b>가 확산되고 있어요. 분위기는 좋지만 과열 가능성도 있어, <b>신규 매수는 작은 비중</b>부터 접근하는 걸 추천해요.</>
          : usStatus === 'extreme_greed'
            ? <>미국 시장이 <b>극도의 탐욕</b> 상태예요. 단기 과열 신호이니 새로 큰 비중으로 들어가긴 부담스럽고, <b>보유분은 분산</b>해 리스크를 낮추는 게 좋아요.</>
            : <>미국 시장은 <b>중립 구간</b>이에요. 뚜렷한 매수·매도 신호가 없는 시기엔 기존 포지션을 유지하며 관망하는 게 무난해요.</>;

  // ── 버핏 지수 plain-help ────────────────────────────────────────────
  const buffettHelpText =
    buffettStatus === 'undervalued'
      ? <>시장 전체가 <b>저평가</b> 상태예요. 역사적으로 이 구간에서 매수한 경우 장기 수익 가능성이 높았어요. <b>우량 종목 비중을 천천히 늘려보는 게 유리</b>해요.</>
      : buffettStatus === 'neutral'
        ? <>시장 밸류에이션이 <b>적정 수준</b>이에요. 지금은 무리한 베팅보다 기존 포지션을 관리하고, <b>저평가 개별 종목을 탐색</b>하는 전략이 좋아요.</>
        : buffettStatus === 'bubble'
          ? <>시장 전체가 <b>거품 구간</b>에 진입했어요. 과거 같은 수치 이후엔 큰 조정이 잦았어요. <b>현금 비중을 높이거나 방어적 포지션</b>으로 전환을 고려해 보세요.</>
          : <>시장 전체가 <b>다소 비싸진 상태</b>예요. 과거 같은 수치 이후엔 조정이 자주 있었어요. <b>새로 크게 들어가긴 부담스럽고</b>, 가진 종목은 분산해서 위험을 나눠두는 게 좋아요.</>;

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
          {marketInsight?.indices_summary
            ? <div className="plain-help mb-8" dangerouslySetInnerHTML={{ __html: marketInsight.indices_summary }} />
            : <div className="plain-help mb-8">{indicesHelpText}</div>
          }

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
                {fearGreedTab === 'KR' ? fearGreedKRHelpText : fearGreedUSHelpText}
              </div>
            </div>
            <div className="card lg:col-span-2">
              <SectionTitle kicker="Valuation" title="버핏 지수" />
              <BuffettGauge value={buffettVal} status={buffettStatus} />
              <div className="plain-help mt-5">{buffettHelpText}</div>
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
