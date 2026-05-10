'use client';
import { useEffect, useState } from 'react';
import { fetchInsight } from '@/lib/api';

export default function AiInsight({ code }: { code: string }) {
  const [data, setData] = useState<{ summary: string; reason: string; cached?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchInsight(code)
      .then(r => r.json())
      .then(d => {
        if (d?.summary) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [code]);

  return (
    <div className="card">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="kicker">AI Insight</div>
          <h2 className="headline text-xl text-fg mt-1">AI 인사이트</h2>
        </div>
        {data?.cached && (
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-3">Cached</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-bg-3 rounded w-3/4" />
          <div className="h-4 bg-bg-3 rounded w-full" />
          <div className="h-4 bg-bg-3 rounded w-5/6" />
        </div>
      ) : data ? (
        <div>
          <div className="text-base text-fg mb-3 leading-relaxed">{data.summary}</div>
          <div className="text-sm text-fg-2 leading-relaxed">{data.reason}</div>
          <div className="text-[10px] text-fg-3 mt-4 pt-3 border-t border-line">
            ※ AI 분석 결과 — 투자 권유가 아닙니다.
          </div>
        </div>
      ) : (
        <div className="text-fg-3 text-sm">분석 데이터를 불러올 수 없습니다.</div>
      )}
    </div>
  );
}
