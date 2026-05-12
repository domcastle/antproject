'use client';
import { use, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { STOCKS, calcSilhouetteZone } from '@/lib/mockData';
import { fetchSilhouette, fetchStockList, SWR_POLL } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import StockHeader from '@/components/StockHeader';
import CandleChart from '@/components/CandleChart';
import SilhouettePanel from '@/components/SilhouettePanel';
import AiInsight from '@/components/AiInsight';
import SupplyChart from '@/components/SupplyChart';
import ValuationCard from '@/components/ValuationCard';

export default function StockDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const stock = STOCKS.find(s => s.code === code) ?? STOCKS[0];
  const [silhouette, setSilhouette] = useState<{ zone: number; position_pct: number; signal_text?: string; rsi?: number | null } | null>(null);

  const { data: stockListRaw } = useSWR<any[]>(
    'stock-list', () => fetchStockList().then(r => r.json()), SWR_POLL,
  );
  const apiStock = useMemo(
    () => stockListRaw?.find((s: any) => s.code === code) ?? null,
    [stockListRaw, code],
  );

  const livePrice    = apiStock?.price      ?? stock.price;
  const liveChangePct = apiStock?.change_pct ?? stock.changePct;
  const liveChange   = apiStock
    ? Math.round(livePrice * liveChangePct / 100 * 10) / 10
    : stock.change;

  useEffect(() => {
    fetchSilhouette(code).then(r => r.json()).then(d => {
      if (d?.zone) setSilhouette({ zone: d.zone, position_pct: d.position_pct ?? 50, signal_text: d.signal_text, rsi: d.rsi ?? null });
    }).catch(() => {});
  }, [code]);

  const fallback = calcSilhouetteZone(livePrice, stock.low52, stock.high52);
  const zone = silhouette?.zone ?? fallback.zone;
  const pct = Math.round(silhouette?.position_pct ?? fallback.pct);

  return (
    <div className="flex min-h-screen">
      <Sidebar active="stock" />
      <main className="flex-1 overflow-x-hidden">
        <div className="px-10 py-8 max-w-[1400px] mx-auto">
          <StockHeader stock={{
            ...stock,
            price: livePrice,
            change: liveChange,
            changePct: liveChangePct,
            silhouetteZone: zone,
          } as any} />

          <div className="mb-4">
            <CandleChart code={code} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <SilhouettePanel zone={zone} positionPct={pct} signal={silhouette?.signal_text ?? fallback.signal} rsi={silhouette?.rsi} />
            <AiInsight code={code} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <SupplyChart code={code} />
            <ValuationCard code={code} />
          </div>
        </div>
      </main>
    </div>
  );
}
