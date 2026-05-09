"use client";

import React from "react";
import useSWR from "swr";
import { fetchValuation, SWR_POLL } from "@/lib/api";
import type { ValuationResponse } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────
function signalColor(s: string): string {
  if (/저평가|우수|양호|매수/.test(s)) return "#26a69a";
  if (/고평가|불량|과열|매도/.test(s)) return "#ef5350";
  return "#8b95a1";
}

function signalBg(s: string): string {
  if (/저평가|우수|양호|매수/.test(s)) return "rgba(38,166,154,0.15)";
  if (/고평가|불량|과열|매도/.test(s)) return "rgba(239,83,80,0.15)";
  return "rgba(139,149,161,0.15)";
}

function fmt(v: number | null, dec = 1, fallback = "N/A"): string {
  return v == null ? fallback : v.toFixed(dec);
}

// ── 개미 해설 ─────────────────────────────────────────────────────────
function perExplain(per: number | null): string {
  if (per == null) return "데이터 없음";
  if (per <= 0)   return "현재 적자 기업 — 이익 회수 기간 계산 불가";
  if (per < 10)   return `현재 이익 기준 ${per.toFixed(0)}년 후 투자금 회수 — 저평가 신호`;
  if (per < 20)   return `현재 이익 기준 ${per.toFixed(0)}년 후 투자금 회수 — 적정 수준`;
  return          `현재 이익 기준 ${per.toFixed(0)}년 후 투자금 회수 — 고평가 주의`;
}

function pbrExplain(pbr: number | null): string {
  if (pbr == null) return "데이터 없음";
  if (pbr < 1)    return `순자산보다 싸게 거래 중 — 청산가치 이하, 극단적 저평가 가능성`;
  if (pbr < 1.5)  return `장부가 대비 ${pbr.toFixed(1)}배 — 비교적 저렴한 프리미엄`;
  if (pbr < 3)    return `장부가 대비 ${pbr.toFixed(1)}배 — 적정 성장 프리미엄`;
  return          `장부가 대비 ${pbr.toFixed(1)}배 — 고성장 기대 또는 과대평가`;
}

function roeExplain(roe: number | null): string {
  if (roe == null) return "데이터 없음";
  if (roe < 0)    return "자기자본 손실 중 — 수익성 악화 경보";
  if (roe < 5)    return `자본 100원으로 ${roe.toFixed(1)}원 벌어 — 수익성 낮음`;
  if (roe < 15)   return `자본 100원으로 ${roe.toFixed(1)}원 벌어 — 평균 수준`;
  return          `자본 100원으로 ${roe.toFixed(1)}원 벌어 — 우수한 수익성`;
}

// ── MetricCard ─────────────────────────────────────────────────────────
interface MetricCardProps {
  label:   string;
  value:   string;
  unit?:   string;
  signal?: string;
  sub?:    string;
}

function MetricCard({ label, value, unit, signal, sub }: MetricCardProps) {
  const color = signal ? signalColor(signal) : undefined;
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-[#1e2232] p-3">
      <p className="mb-1 text-[11px] text-gray-500">{label}</p>
      <p className="text-base font-bold tabular-nums text-gray-100">
        {value}
        {unit && value !== "N/A" && (
          <span className="ml-0.5 text-[11px] font-normal text-gray-500">{unit}</span>
        )}
      </p>
      {signal && (
        <span
          className="mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{ color, backgroundColor: signalBg(signal) }}
        >
          {signal}
        </span>
      )}
      {sub && (
        <p
          className="mt-1 text-[10px]"
          style={{ color: sub.startsWith("+") ? "#26a69a" : sub.startsWith("-") ? "#ef5350" : "#6b7280" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Sector PER gauge ───────────────────────────────────────────────────
function SectorPerGauge({ per, sector_per }: { per: number; sector_per: number }) {
  const max    = Math.max(per, sector_per) * 1.35;
  const stockW = Math.min((per / max) * 100, 100);
  const sectW  = Math.min((sector_per / max) * 100, 100);
  const diff   = ((per / sector_per - 1) * 100).toFixed(1);
  const cheap  = per < sector_per;

  return (
    <div className="rounded-lg bg-[#1e2232] p-3">
      <p className="mb-2.5 text-[11px] text-gray-500">업종 PER 비교</p>
      <div className="space-y-2">
        {/* Stock PER */}
        <div>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-gray-400">이 종목</span>
            <span className="font-medium tabular-nums text-gray-200">{per.toFixed(1)}배</span>
          </div>
          <div className="h-2 rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${stockW}%` }}
            />
          </div>
        </div>

        {/* Sector PER */}
        <div>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-gray-400">업종 평균</span>
            <span className="font-medium tabular-nums text-gray-200">{sector_per.toFixed(1)}배</span>
          </div>
          <div className="h-2 rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gray-500 transition-all duration-700"
              style={{ width: `${sectW}%` }}
            />
          </div>
        </div>
      </div>

      <p
        className="mt-2 text-[11px] font-medium"
        style={{ color: cheap ? "#26a69a" : "#ef5350" }}
      >
        업종 대비{" "}
        {cheap
          ? `${Math.abs(Number(diff))}% 저평가`
          : `${Math.abs(Number(diff))}% 고평가`}
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
interface Props { code: string }

export function ValuationCard({ code }: Props) {
  const { data, isLoading } = useSWR<ValuationResponse>(
    `valuation/${code}`,
    () => fetchValuation(code).then(r => r.json()),
    SWR_POLL,
  );

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl bg-[#131722]">
        <span className="text-sm text-gray-600">투자지표 로딩 중…</span>
      </div>
    );
  }
  if (!data) return null;

  const { per, pbr, roe, eps, eps_yoy, sector_per, signals } = data;

  const epsStr    = eps != null ? eps.toLocaleString() : "N/A";
  const epsSub    = eps_yoy != null
    ? `전년比 ${eps_yoy > 0 ? "+" : ""}${eps_yoy.toFixed(1)}%`
    : undefined;

  return (
    <div className="rounded-xl bg-[#131722] p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-300">투자 지표</h3>

      {/* ── 4 metric cards ── */}
      <div className="mb-4 flex gap-2">
        <MetricCard
          label="PER"
          value={fmt(per)}
          unit="배"
          signal={signals.per}
        />
        <MetricCard
          label="PBR"
          value={fmt(pbr, 2)}
          unit="배"
          signal={signals.pbr}
        />
        <MetricCard
          label="ROE"
          value={fmt(roe)}
          unit="%"
          signal={signals.roe}
        />
        <MetricCard
          label="EPS"
          value={epsStr}
          unit={eps != null ? "원" : ""}
          sub={epsSub}
        />
      </div>

      {/* ── Sector PER comparison ── */}
      {per != null && sector_per != null && (
        <div className="mb-4">
          <SectorPerGauge per={per} sector_per={sector_per} />
        </div>
      )}

      {/* ── 개미 해설 ── */}
      <div className="rounded-lg bg-[#1e2232] p-3">
        <p className="mb-2.5 text-[11px] font-semibold text-yellow-400">💡 개미 해설</p>
        <div className="space-y-2.5">
          {(
            [
              { key: "PER", text: perExplain(per) },
              { key: "PBR", text: pbrExplain(pbr) },
              { key: "ROE", text: roeExplain(roe) },
            ] as const
          ).map(({ key, text }) => (
            <div key={key} className="flex gap-3 text-xs">
              <span className="w-7 flex-shrink-0 font-semibold text-gray-400">{key}</span>
              <span className="leading-relaxed text-gray-300">{text}</span>
            </div>
          ))}

          {/* EPS YoY context */}
          {eps_yoy != null && (
            <div className="flex gap-3 text-xs">
              <span className="w-7 flex-shrink-0 font-semibold text-gray-400">EPS</span>
              <span className="leading-relaxed text-gray-300">
                주당 순이익{" "}
                <span
                  style={{
                    color:
                      eps_yoy > 0 ? "#26a69a" : eps_yoy < 0 ? "#ef5350" : "#8b95a1",
                  }}
                >
                  {eps_yoy > 20
                    ? "급증"
                    : eps_yoy > 0
                    ? "증가"
                    : eps_yoy < -20
                    ? "급감"
                    : eps_yoy < 0
                    ? "감소"
                    : "보합"}
                </span>{" "}
                추세 (전년比 {eps_yoy > 0 ? "+" : ""}
                {eps_yoy.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
