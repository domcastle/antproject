"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, Legend,
} from "recharts";
import useSWR from "swr";
import { fetchSupply, SWR_POLL } from "@/lib/api";
import type { SupplyItem } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────
type Tab = "live" | "daily";

const INVESTOR = [
  { key: "individual"  as const, label: "개인",   color: "#3b82f6" },
  { key: "foreign"     as const, label: "외국인", color: "#f97316" },
  { key: "institution" as const, label: "기관",   color: "#8b5cf6" },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────
function fmtAmt(v: number): string {
  if (v === 0) return "0";
  const abs  = Math.abs(v);
  const sign = v > 0 ? "+" : "-";
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}억`;
  return `${sign}${abs.toLocaleString()}만`;
}

function fmtAmtAbs(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return "0";
  if (abs >= 10_000) return `${(abs / 10_000).toFixed(0)}억`;
  return `${abs.toLocaleString()}만`;
}

function AmtSpan({ value }: { value: number }) {
  const cls =
    value > 0 ? "text-[#26a69a]" : value < 0 ? "text-[#ef5350]" : "text-gray-400";
  return <span className={cls}>{fmtAmt(value)}</span>;
}

// ── Tooltips ───────────────────────────────────────────────────────────
function LiveTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border border-gray-700 bg-[#1e2232] px-3 py-2 text-xs shadow-xl">
      <span style={{ color: d.payload.color }} className="font-medium">
        {d.payload.label}
      </span>
      <span
        className={`ml-3 ${
          (d.value as number) >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"
        }`}
      >
        {fmtAmt(d.value as number)}
      </span>
    </div>
  );
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[140px] rounded-lg border border-gray-700 bg-[#1e2232] p-3 text-xs shadow-xl">
      <p className="mb-1.5 text-[11px] text-gray-500">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className={p.value >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}>
            {fmtAmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
interface Props { code: string }

export function SupplyChart({ code }: Props) {
  const [tab, setTab] = useState<Tab>("live");

  const { data: raw, isLoading } = useSWR<SupplyItem[]>(
    `supply/${code}`,
    () => fetchSupply(code).then(r => r.json()),
    SWR_POLL,
  );

  const { latest, latestBars, liveDomain, recent20, trendDomain } = useMemo(() => {
    if (!raw?.length) {
      return { latest: null, latestBars: [], liveDomain: [-1, 1] as [number, number], recent20: [], trendDomain: [-1, 1] as [number, number] };
    }

    const latest = raw[raw.length - 1];

    const latestBars = INVESTOR.map(inv => ({
      label:  inv.label,
      amount: latest[inv.key],
      color:  inv.color,
    }));

    const liveMax = Math.max(...latestBars.map(d => Math.abs(d.amount)), 1) * 1.25;
    const liveDomain: [number, number] = [-liveMax, liveMax];

    const recent20 = raw.slice(-20).map(d => ({
      date:        d.date.slice(5),   // "MM-DD"
      individual:  d.individual,
      foreign:     d.foreign,
      institution: d.institution,
    }));

    const trendMax = Math.max(
      ...recent20.flatMap(d => [
        Math.abs(d.individual),
        Math.abs(d.foreign),
        Math.abs(d.institution),
      ]),
      1,
    ) * 1.15;
    const trendDomain: [number, number] = [-trendMax, trendMax];

    return { latest, latestBars, liveDomain, recent20, trendDomain };
  }, [raw]);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl bg-[#131722] p-4">

      {/* Tabs */}
      <div className="mb-4 flex gap-1">
        {([["live", "실시간 수급"], ["daily", "일별 추이"]] as [Tab, string][]).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                tab === key
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* Loading / empty */}
      {isLoading ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-gray-600">
          수급 데이터 로딩 중…
        </div>
      ) : !raw?.length || !latest ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-gray-600">
          데이터 없음
        </div>
      ) : tab === "live" ? (
        /* ── 실시간 수급 탭 ──────────────────────────────────────────── */
        <div>
          <p className="mb-3 text-[11px] text-gray-500">{latest.date} 기준</p>

          {/* Horizontal bar chart */}
          <ResponsiveContainer width="100%" height={150}>
            <BarChart
              layout="vertical"
              data={latestBars}
              margin={{ top: 0, right: 72, bottom: 0, left: 0 }}
            >
              <CartesianGrid stroke="#1e2232" horizontal={false} />
              <XAxis
                type="number"
                domain={liveDomain}
                tick={{ fill: "#4b5563", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtAmtAbs}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <ReferenceLine x={0} stroke="#374151" strokeWidth={1} />
              <Tooltip content={<LiveTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="amount" barSize={30} radius={[0, 4, 4, 0]}>
                {latestBars.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.amount >= 0 ? d.color : d.color + "88"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Summary cards */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {INVESTOR.map(inv => (
              <div
                key={inv.key}
                className="rounded-lg bg-[#1e2232] p-3 text-center"
              >
                <p
                  className="mb-1 text-[11px] font-medium"
                  style={{ color: inv.color }}
                >
                  {inv.label}
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color:
                      latest[inv.key] >= 0 ? "#26a69a" : "#ef5350",
                  }}
                >
                  {fmtAmt(latest[inv.key])}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-600">
                  {latest[inv.key] >= 0 ? "순매수" : "순매도"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── 일별 추이 탭 ────────────────────────────────────────────── */
        <div>
          {/* Trend grouped bar chart */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={recent20}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2232" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#4b5563", fontSize: 10 }}
                axisLine={{ stroke: "#2a2d3e" }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={trendDomain}
                tick={{ fill: "#4b5563", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtAmtAbs}
                width={44}
              />
              <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#9ca3af", paddingTop: 6 }}
              />
              {INVESTOR.map(inv => (
                <Bar
                  key={inv.key}
                  dataKey={inv.key}
                  name={inv.label}
                  fill={inv.color}
                  maxBarSize={8}
                  isAnimationActive={false}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Daily table */}
          <div className="mt-4 max-h-[220px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#131722]">
                <tr className="border-b border-gray-800 text-gray-500">
                  <th className="py-2 pl-2 text-left">날짜</th>
                  {INVESTOR.map(inv => (
                    <th
                      key={inv.key}
                      className="py-2 pr-2 text-right"
                      style={{ color: inv.color }}
                    >
                      {inv.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...raw].reverse().map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-800/40 transition-colors hover:bg-[#1e2232]"
                  >
                    <td className="py-1.5 pl-2 text-gray-400">
                      {row.date.slice(5)}
                    </td>
                    {INVESTOR.map(inv => (
                      <td key={inv.key} className="py-1.5 pr-2 text-right">
                        <AmtSpan value={row[inv.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
