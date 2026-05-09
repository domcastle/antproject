"use client";

import React from "react";
import { motion } from "motion/react";
import useSWR from "swr";
import { fetchSilhouette, SWR_POLL } from "@/lib/api";
import { SILHOUETTE_COLORS } from "@/lib/constants";
import type { SilhouetteResponse, SilhouetteZone } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────
const SVG_W  = 80;
const SVG_H  = 200;
const BAND_H = SVG_H / 5; // 40px per zone

// top-to-bottom order: zone 5 (머리) → zone 1 (발목)
const ZONES_TOP_DOWN: SilhouetteZone[] = [5, 4, 3, 2, 1];

const ZONE_LABEL: Record<SilhouetteZone, string> = {
  1: "발목",
  2: "무릎",
  3: "허리",
  4: "어깨",
  5: "머리",
};

const ZONE_DESC: Record<SilhouetteZone, string> = {
  1: "52주 저점 부근 — 강한 매수 구간",
  2: "저평가 구간 — 매수 우세",
  3: "중립 구간 — 관망",
  4: "고평가 구간 — 매도 우세",
  5: "52주 고점 부근 — 과열 경보",
};

// ── Body Silhouette SVG ────────────────────────────────────────────────
// Anatomical zone mapping (viewBox 80×200):
//  머리(5): y  0–40   head circle + neck top
//  어깨(4): y 40–80   upper torso + arm top
//  허리(3): y 80–120  mid torso
//  무릎(2): y120–160  pelvis + upper legs
//  발목(1): y160–200  lower legs + feet

function BodyClipPath({ id }: { id: string }) {
  return (
    <clipPath id={id}>
      {/* Head */}
      <circle cx="40" cy="17" r="15" />
      {/* Neck */}
      <rect x="34" y="30" width="12" height="12" />
      {/* Torso trapezoid: wide shoulders → narrower waist */}
      <polygon points="14,42 66,42 58,115 22,115" />
      {/* Left arm */}
      <rect x="4" y="42" width="13" height="65" rx="5" />
      {/* Right arm */}
      <rect x="63" y="42" width="13" height="65" rx="5" />
      {/* Pelvis */}
      <polygon points="22,115 58,115 62,132 18,132" />
      {/* Left leg */}
      <rect x="17" y="132" width="21" height="68" rx="4" />
      {/* Right leg */}
      <rect x="42" y="132" width="21" height="68" rx="4" />
    </clipPath>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
interface Props { code: string }

export function SilhouettePanel({ code }: Props) {
  const { data, isLoading } = useSWR<SilhouetteResponse>(
    `silhouette/${code}`,
    () => fetchSilhouette(code).then(r => r.json()),
    SWR_POLL,
  );

  if (isLoading) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl bg-[#131722]">
        <span className="text-sm text-gray-600">실루엣 분석 중…</span>
      </div>
    );
  }
  if (!data) return null;

  const { zone, signal_text, rsi, position_pct } = data;
  const zoneColor = SILHOUETTE_COLORS[zone];
  const clipId    = `silhouette-body-${code}`;

  // Dot y-position: 100% → top (머리), 0% → bottom (발목)
  const dotY = Math.max(8, Math.min(SVG_H - 8, SVG_H * (1 - position_pct / 100)));

  const rsiStatus =
    rsi >= 70 ? "과매수" : rsi <= 30 ? "과매도" : "중립";
  const rsiColor  =
    rsi >= 70 ? "#ef5350" : rsi <= 30 ? "#26a69a" : "#f59e0b";

  return (
    <div className="rounded-xl bg-[#131722] p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-300">실루엣 구간 분석</h3>

      <div className="flex gap-2">

        {/* ── SVG Silhouette + zone labels ── */}
        <div className="flex flex-shrink-0 gap-2">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width={SVG_W}
            height={SVG_H}
            className="overflow-visible"
          >
            <defs>
              <BodyClipPath id={clipId} />
            </defs>

            {/* Zone-colored bands, clipped to body shape */}
            <g clipPath={`url(#${clipId})`}>
              {ZONES_TOP_DOWN.map((z, idx) => (
                <rect
                  key={z}
                  x={0}
                  y={idx * BAND_H}
                  width={SVG_W}
                  height={BAND_H}
                  fill={SILHOUETTE_COLORS[z]}
                  opacity={z === zone ? 0.85 : 0.18}
                />
              ))}

              {/* Subtle zone dividers */}
              {[1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1={0} y1={i * BAND_H}
                  x2={SVG_W} y2={i * BAND_H}
                  stroke="#111827"
                  strokeWidth={0.8}
                />
              ))}
            </g>

            {/* Outer body stroke (unclipped) */}
            <g clipPath={`url(#${clipId})`} fill="none" stroke="#374151" strokeWidth={0.6}>
              <rect x={0} y={0} width={SVG_W} height={SVG_H} />
            </g>

            {/* Pulse ring — NOT clipped so it can bleed outside body */}
            <motion.circle
              cx={40}
              cy={dotY}
              r={8}
              fill="none"
              stroke={zoneColor}
              strokeWidth={1.5}
              animate={{ r: [8, 22], opacity: [0.85, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />

            {/* Current position dot */}
            <circle cx={40} cy={dotY} r={5} fill={zoneColor} />
            <circle cx={40} cy={dotY} r={2.5} fill="white" opacity={0.7} />
          </svg>

          {/* Zone labels column (vertically aligned with bands) */}
          <div
            className="flex flex-col text-[11px]"
            style={{ height: SVG_H }}
          >
            {ZONES_TOP_DOWN.map(z => (
              <div
                key={z}
                className="flex items-center"
                style={{
                  height: BAND_H,
                  color:      z === zone ? SILHOUETTE_COLORS[z] : "#4b5563",
                  fontWeight: z === zone ? 700 : 400,
                }}
              >
                {ZONE_LABEL[z]}
              </div>
            ))}
          </div>
        </div>

        {/* ── Info panel ── */}
        <div className="flex flex-1 flex-col justify-between py-1 pl-2">

          {/* Zone badge */}
          <div>
            <p className="mb-1.5 text-[11px] text-gray-500">현재 구간</p>
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: zoneColor }}
            >
              Zone {zone} &nbsp;{ZONE_LABEL[zone]}
            </span>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
              {ZONE_DESC[zone]}
            </p>
          </div>

          {/* RSI */}
          <div>
            <p className="mb-1 text-[11px] text-gray-500">RSI (14)</p>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: rsiColor }}
              >
                {rsi.toFixed(1)}
              </span>
              <span className="text-xs" style={{ color: rsiColor }}>
                {rsiStatus}
              </span>
            </div>
            {/* RSI progress bar with 30/70 thresholds */}
            <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-gray-800">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(rsi, 100)}%`, backgroundColor: rsiColor }}
              />
              {/* Threshold tick marks */}
              <div className="absolute top-0 h-full w-px bg-gray-600" style={{ left: "30%" }} />
              <div className="absolute top-0 h-full w-px bg-gray-600" style={{ left: "70%" }} />
            </div>
            <div className="relative mt-0.5 h-3 w-full text-[9px] text-gray-600">
              <span className="absolute" style={{ left: "30%", transform: "translateX(-50%)" }}>30</span>
              <span className="absolute" style={{ left: "70%", transform: "translateX(-50%)" }}>70</span>
            </div>
          </div>

          {/* 52-week position */}
          <div>
            <p className="mb-1 text-[11px] text-gray-500">52주 위치</p>
            <div className="flex items-baseline gap-1">
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: zoneColor }}
              >
                {position_pct.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">%</span>
            </div>
            <p className="text-[10px] text-gray-600">
              저점 대비 &nbsp;
              <span style={{ color: zoneColor }}>
                상위 {(100 - position_pct).toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ── AI 보정 신호 footer ── */}
      <div
        className="mt-4 rounded-lg p-3"
        style={{
          backgroundColor: zoneColor + "1a",
          borderLeft: `3px solid ${zoneColor}`,
        }}
      >
        <p className="text-[11px] font-semibold" style={{ color: zoneColor }}>
          RSI 보정 신호
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-300">
          {signal_text}
        </p>
      </div>
    </div>
  );
}
