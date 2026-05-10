'use client';
import { useEffect, useState } from 'react';
import { fetchSupply } from '@/lib/api';

interface Item { date: string; individual: number; foreign: number; institution: number; }

export default function SupplyChart({ code }: { code: string }) {
  const [data, setData] = useState<Item[]>([]);
  useEffect(() => {
    fetchSupply(code).then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length) setData(d.slice(-5));
    }).catch(() => {});
  }, [code]);

  if (!data.length) {
    return (
      <div className="card">
        <div className="kicker">Supply</div>
        <h2 className="headline text-xl text-fg mt-1 mb-4">5일 수급</h2>
        <div className="h-32 flex items-center justify-center text-fg-3 text-sm">데이터 없음</div>
      </div>
    );
  }

  const totals = {
    individual: data.reduce((s, x) => s + x.individual, 0),
    foreign: data.reduce((s, x) => s + x.foreign, 0),
    institution: data.reduce((s, x) => s + x.institution, 0),
  };
  const max = Math.max(
    ...data.flatMap(x => [Math.abs(x.individual), Math.abs(x.foreign), Math.abs(x.institution)]),
  );

  const Bar = ({ label, val, c }: { label: string; val: number; c: string }) => {
    const pct = Math.min(Math.abs(val) / max, 1) * 100;
    const pos = val >= 0;
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="text-fg-2 w-14">{label}</span>
        <div className="relative flex-1 h-5 bg-bg-3 rounded">
          <div className="absolute top-0 bottom-0 w-px bg-line" style={{ left: '50%' }} />
          <div className="absolute top-0 bottom-0 rounded transition-all" style={{
            width: `${pct / 2}%`,
            [pos ? 'left' : 'right']: '50%',
            background: c,
          }} />
        </div>
        <span className="num text-right w-20" style={{ color: pos ? '#ff5b5b' : '#4a90ff' }}>
          {pos ? '+' : ''}{(val / 10000).toFixed(1)}억
        </span>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="kicker">Supply · 5D</div>
          <h2 className="headline text-xl text-fg mt-1">5일 수급</h2>
        </div>
        <div className="text-[11px] text-fg-3">단위: 만원</div>
      </div>
      <div className="space-y-3">
        <Bar label="개인"   val={totals.individual}   c="#c8a464" />
        <Bar label="외국인" val={totals.foreign}     c="#42a5f5" />
        <Bar label="기관"   val={totals.institution} c="#f5a623" />
      </div>
      <div className="mt-4 pt-3 border-t border-line">
        <div className="grid grid-cols-5 gap-1">
          {data.map((d, i) => {
            const dom = Math.abs(d.individual) > Math.abs(d.foreign) && Math.abs(d.individual) > Math.abs(d.institution)
              ? { v: d.individual, label: '개인', c: '#c8a464' }
              : Math.abs(d.foreign) > Math.abs(d.institution)
              ? { v: d.foreign, label: '외국인', c: '#42a5f5' }
              : { v: d.institution, label: '기관', c: '#f5a623' };
            return (
              <div key={i} className="text-center">
                <div className="font-mono text-[9px] text-fg-3">{d.date.slice(5)}</div>
                <div className="text-[10px] mt-1 font-semibold" style={{ color: dom.c }}>{dom.label}</div>
                <div className="num text-[10px] mt-0.5" style={{ color: dom.v >= 0 ? '#ff5b5b' : '#4a90ff' }}>
                  {dom.v >= 0 ? '+' : ''}{(dom.v / 10000).toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
