'use client';
import { useEffect, useState } from 'react';
import { fetchValuation } from '@/lib/api';

const SIGNAL_COLOR: Record<string, string> = {
  good: '#4ade80', neutral: '#aab2bf', bad: '#ff5b5b',
  cheap: '#4ade80', fair: '#aab2bf', expensive: '#ff5b5b',
};
const SIGNAL_TEXT: Record<string, string> = {
  good: '양호', neutral: '보통', bad: '주의', cheap: '저평가', fair: '적정', expensive: '고평가',
};

function Cell({ label, value, suffix, signal, desc }: {
  label: string; value: number | null; suffix?: string; signal?: string; desc?: string;
}) {
  const color = signal ? SIGNAL_COLOR[signal] ?? '#aab2bf' : '#eef0f4';
  return (
    <div className="border border-line rounded-md p-4">
      <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-3">{label}</div>
      <div className="num text-2xl mt-1.5 font-semibold" style={{ color }}>
        {value !== null ? value.toFixed(2) : '–'}
        {suffix && <span className="text-fg-3 text-sm ml-1">{suffix}</span>}
      </div>
      {signal && (
        <div className="text-[11px] mt-1" style={{ color }}>
          {SIGNAL_TEXT[signal] ?? signal}
        </div>
      )}
      {desc && <div className="text-[11px] text-fg-3 mt-2">{desc}</div>}
    </div>
  );
}

export default function ValuationCard({ code, fallback }: {
  code: string; fallback?: { per?: number | null; pbr?: number | null };
}) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetchValuation(code).then(r => r.json()).then(d => {
      if (d && (d.per !== undefined || d.pbr !== undefined)) setData(d);
    }).catch(() => {});
  }, [code]);

  const per = data?.per ?? fallback?.per ?? null;
  const pbr = data?.pbr ?? fallback?.pbr ?? null;
  const roe = data?.roe ?? null;
  const eps = data?.eps ?? null;
  const epsYoy = data?.eps_yoy ?? null;
  const sectorPer = data?.sector_per ?? null;
  const sig = data?.signals ?? {};

  return (
    <div className="card">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="kicker">Valuation</div>
          <h2 className="headline text-xl text-fg mt-1">밸류에이션</h2>
        </div>
        {sectorPer !== null && (
          <div className="text-[11px] text-fg-3">업종 평균 PER {sectorPer.toFixed(1)}</div>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Cell label="PER" value={per} suffix="배" signal={sig.per} desc="주가 / 주당순이익" />
        <Cell label="PBR" value={pbr} suffix="배" signal={sig.pbr} desc="주가 / 주당순자산" />
        <Cell label="ROE" value={roe} suffix="%" signal={sig.roe} desc="자기자본이익률" />
        <Cell label="EPS" value={eps} suffix="원"
              desc={epsYoy !== null ? `YoY ${epsYoy >= 0 ? '+' : ''}${epsYoy.toFixed(1)}%` : '주당순이익'} />
      </div>
    </div>
  );
}
