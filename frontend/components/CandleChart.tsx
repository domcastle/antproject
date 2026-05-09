"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ComposedChart, Bar, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import useSWR from "swr";
import { fetchOhlcv, SWR_POLL } from "@/lib/api";
import type { OhlcvItem } from "@/lib/types";

// ── Local types ────────────────────────────────────────────────────────
type Period = "3mo" | "6mo" | "1y";
type MaKey  = "ma5" | "ma20" | "ma60" | "ma120";

type EnrichedItem = OhlcvItem & { bb_band?: number };

// ── Constants ──────────────────────────────────────────────────────────
const PERIODS: { label: string; value: Period }[] = [
  { label: "3개월", value: "3mo" },
  { label: "6개월", value: "6mo" },
  { label: "1년",   value: "1y"  },
];

const MA_CONFIG = [
  { key: "ma5"  as MaKey, color: "#f59e0b", label: "MA5"   },
  { key: "ma20" as MaKey, color: "#3b82f6", label: "MA20"  },
  { key: "ma60" as MaKey, color: "#8b5cf6", label: "MA60"  },
  { key: "ma120"as MaKey, color: "#ec4899", label: "MA120" },
] as const;

const UP_CLR = "#26a69a";
const DN_CLR = "#ef5350";
const BB_CLR = "#60a5fa";

// ── Tooltip ────────────────────────────────────────────────────────────
function CandleTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as EnrichedItem | undefined;
  if (!d) return null;

  const isUp = d.close >= d.open;
  const volStr =
    d.volume >= 1_000_000
      ? `${(d.volume / 1_000_000).toFixed(1)}M`
      : `${(d.volume / 1_000).toFixed(0)}K`;

  return (
    <div className="min-w-[160px] rounded-lg border border-gray-700 bg-[#1e2232] p-3 text-xs shadow-2xl">
      <p className="mb-1.5 text-[11px] text-gray-500">{d.date}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-200">
        <span className="text-gray-500">시가</span>
        <span>{d.open.toLocaleString()}</span>
        <span className="text-gray-500">고가</span>
        <span className="text-[#ef5350]">{d.high.toLocaleString()}</span>
        <span className="text-gray-500">저가</span>
        <span className="text-[#26a69a]">{d.low.toLocaleString()}</span>
        <span className="text-gray-500">종가</span>
        <span className={isUp ? "text-[#ef5350]" : "text-[#26a69a]"}>
          {d.close.toLocaleString()}
        </span>
        <span className="text-gray-500">거래량</span>
        <span>{volStr}</span>
      </div>
      {(d.ma5 ?? d.ma20 ?? d.ma60 ?? d.ma120) != null && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 border-t border-gray-700 pt-1.5">
          {d.ma5   != null && <><span className="text-[#f59e0b]">MA5</span>  <span className="text-gray-200">{d.ma5.toLocaleString()}</span></>}
          {d.ma20  != null && <><span className="text-[#3b82f6]">MA20</span> <span className="text-gray-200">{d.ma20.toLocaleString()}</span></>}
          {d.ma60  != null && <><span className="text-[#8b5cf6]">MA60</span> <span className="text-gray-200">{d.ma60.toLocaleString()}</span></>}
          {d.ma120 != null && <><span className="text-[#ec4899]">MA120</span><span className="text-gray-200">{d.ma120.toLocaleString()}</span></>}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
interface Props { code: string }

export function CandleChart({ code }: Props) {
  const [period, setPeriod]       = useState<Period>("1y");
  const [activeMas, setActiveMas] = useState<Set<MaKey>>(new Set(["ma5", "ma20"]));
  const [showBB, setShowBB]       = useState(true);

  const { data: raw, isLoading } = useSWR<OhlcvItem[]>(
    `ohlcv/${code}/${period}`,
    () => fetchOhlcv(code, period).then(r => r.json()),
    SWR_POLL,
  );

  // Compute enriched data + domains
  const { chartData, priceDomain, volDomain } = useMemo(() => {
    if (!raw?.length) {
      return {
        chartData:   [] as EnrichedItem[],
        priceDomain: [0, 1] as [number, number],
        volDomain:   [0, 1] as [number, number],
      };
    }

    const lo  = Math.min(...raw.map(d => d.low));
    const hi  = Math.max(...raw.map(d => d.high));
    const pad = (hi - lo) * 0.05;
    const maxVol = Math.max(...raw.map(d => d.volume));

    const chartData: EnrichedItem[] = raw.map(d => ({
      ...d,
      bb_band:
        d.bb_upper != null && d.bb_lower != null
          ? d.bb_upper - d.bb_lower
          : undefined,
    }));

    return {
      chartData,
      priceDomain: [lo - pad, hi + pad] as [number, number],
      // volume domain scaled so bars fill ~20% of chart height
      volDomain: [0, maxVol * 5] as [number, number],
    };
  }, [raw]);

  // Candlestick custom shape — closes over priceDomain
  const renderCandle = useCallback(
    (props: any) => {
      const { x = 0, width = 0, background, payload } = props;
      if (!payload || !background?.height) return <g />;

      const { open, close, high, low } = payload as OhlcvItem;
      const isUp  = close >= open;
      const color = isUp ? UP_CLR : DN_CLR;

      const [dMin, dMax] = priceDomain;
      const range = dMax - dMin;
      if (range === 0) return <g />;

      const { y: chartY, height: chartH } = background as { y: number; height: number };
      const px = (v: number) => chartY + ((dMax - v) / range) * chartH;

      const highY  = px(high);
      const lowY   = px(low);
      const openY  = px(open);
      const closeY = px(close);
      const top    = Math.min(openY, closeY);
      const bodyH  = Math.max(Math.abs(closeY - openY), 1);
      const cx     = x + width / 2;

      return (
        <g>
          {/* Upper wick: high → body top */}
          <line x1={cx} y1={highY}       x2={cx} y2={top}        stroke={color} strokeWidth={1} />
          {/* Lower wick: body bottom → low */}
          <line x1={cx} y1={top + bodyH} x2={cx} y2={lowY}       stroke={color} strokeWidth={1} />
          {/* Body */}
          <rect
            x={x + 1}
            y={top}
            width={Math.max(width - 2, 1)}
            height={bodyH}
            fill={color}
          />
        </g>
      );
    },
    [priceDomain],
  );

  const toggleMa = (key: MaKey) =>
    setActiveMas(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl bg-[#131722] p-4">

      {/* Controls row */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

        {/* Period tabs */}
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Indicator toggles */}
        <div className="flex flex-wrap gap-1.5">
          {MA_CONFIG.map(({ key, color, label }) => (
            <button
              key={key}
              onClick={() => toggleMa(key)}
              style={
                activeMas.has(key)
                  ? { borderColor: color, color, backgroundColor: color + "22" }
                  : undefined
              }
              className={`rounded border px-2 py-0.5 text-xs transition-colors ${
                activeMas.has(key)
                  ? ""
                  : "border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setShowBB(v => !v)}
            className={`rounded border px-2 py-0.5 text-xs transition-colors ${
              showBB
                ? "border-blue-400 bg-blue-400/20 text-blue-300"
                : "border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400"
            }`}
          >
            BB
          </button>
        </div>
      </div>

      {/* Chart area */}
      {isLoading ? (
        <div className="flex h-[460px] items-center justify-center">
          <span className="text-sm text-gray-600">차트 로딩 중…</span>
        </div>
      ) : !chartData.length ? (
        <div className="flex h-[460px] items-center justify-center">
          <span className="text-sm text-gray-600">데이터 없음</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={460}>
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e2232"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#4b5563", fontSize: 10 }}
              axisLine={{ stroke: "#2a2d3e" }}
              tickLine={false}
              minTickGap={50}
              tickFormatter={v => (typeof v === "string" ? v.slice(5) : v)}
            />
            {/* Price axis — right side */}
            <YAxis
              yAxisId="price"
              orientation="right"
              domain={priceDomain}
              tick={{ fill: "#4b5563", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v.toLocaleString()}
              width={72}
            />
            {/* Volume axis — hidden, scaled so bars stay in bottom 20% */}
            <YAxis
              yAxisId="vol"
              domain={volDomain}
              hide
            />

            <Tooltip
              content={<CandleTooltip />}
              cursor={{ stroke: "#374151", strokeWidth: 1 }}
            />

            {/* ① Volume bars (rendered first → behind everything) */}
            <Bar
              yAxisId="vol"
              dataKey="volume"
              isAnimationActive={false}
              radius={[1, 1, 0, 0]}
              maxBarSize={12}
            >
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.close >= d.open
                      ? "rgba(38,166,154,0.35)"
                      : "rgba(239,83,80,0.35)"
                  }
                />
              ))}
            </Bar>

            {/* ② Bollinger Band fill (stacked area trick) */}
            {showBB && (
              <>
                {/* Invisible base: 0 → bb_lower (stacking offset) */}
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="bb_lower"
                  stackId="bb"
                  fill="none"
                  stroke="none"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                  isAnimationActive={false}
                  connectNulls
                />
                {/* Visible band: bb_lower → bb_upper */}
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="bb_band"
                  stackId="bb"
                  fill="rgba(96,165,250,0.10)"
                  stroke="none"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                  isAnimationActive={false}
                  connectNulls
                />
                {/* BB upper border */}
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="bb_upper"
                  stroke={BB_CLR}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                  isAnimationActive={false}
                  connectNulls
                />
                {/* BB lower border */}
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="bb_lower"
                  stroke={BB_CLR}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                  isAnimationActive={false}
                  connectNulls
                />
              </>
            )}

            {/* ③ Candlestick bars (on top of BB fill) */}
            <Bar
              yAxisId="price"
              dataKey="high"
              shape={renderCandle}
              isAnimationActive={false}
              legendType="none"
              maxBarSize={14}
            />

            {/* ④ MA Lines (topmost layer) */}
            {MA_CONFIG.map(({ key, color }) =>
              activeMas.has(key) ? (
                <Line
                  key={key}
                  yAxisId="price"
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={false}
                  legendType="none"
                  isAnimationActive={false}
                  connectNulls
                />
              ) : null,
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
