"use client";

import useSWR from "swr";
import { fetchStockList, SWR_POLL } from "@/lib/api";
import { SILHOUETTE_COLORS } from "@/lib/constants";
import type { StockListItem } from "@/lib/types";

const ZONE_LABEL: Record<number, string> = {
  1: "발목", 2: "무릎", 3: "허리", 4: "어깨", 5: "머리",
};

interface Props { code: string }

export function StockHeader({ code }: Props) {
  const { data } = useSWR<StockListItem[]>(
    "stock-list",
    () => fetchStockList().then(r => r.json()),
    { ...SWR_POLL, revalidateOnFocus: false },
  );

  const stock = data?.find(s => s.code === code);
  const isUp  = (stock?.change_pct ?? 0) > 0;
  const isFlat = (stock?.change_pct ?? 0) === 0;

  // Korean convention: up = red, down = blue
  const changeColor = isFlat ? "#8b95a1" : isUp ? "#ef5350" : "#3b82f6";
  const changeArrow = isFlat ? "–" : isUp ? "▲" : "▼";

  const priceStr = stock
    ? stock.market === "KR"
      ? `${stock.price.toLocaleString()}원`
      : `$${stock.price.toLocaleString()}`
    : null;

  const zoneColor = stock ? SILHOUETTE_COLORS[stock.zone] : "#8b95a1";

  return (
    <div className="border-b border-gray-800/50 bg-[#131722] px-4 py-4">
      <div className="mx-auto max-w-5xl flex items-start justify-between gap-4">

        {/* Left: name + price */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {stock ? (
              <h1 className="text-xl font-bold text-white">{stock.name}</h1>
            ) : (
              <div className="h-7 w-36 animate-pulse rounded bg-gray-800" />
            )}
            <span className="text-sm text-gray-500">{code}</span>
            {stock && (
              <span className="rounded border border-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                {stock.market}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-baseline gap-3">
            {priceStr ? (
              <>
                <span className="text-2xl font-bold tabular-nums text-gray-100">
                  {priceStr}
                </span>
                <span className="text-sm font-medium" style={{ color: changeColor }}>
                  {changeArrow}&nbsp;{Math.abs(stock!.change_pct).toFixed(2)}%
                </span>
              </>
            ) : (
              <div className="h-8 w-44 animate-pulse rounded bg-gray-800" />
            )}
          </div>
        </div>

        {/* Right: zone badge */}
        {stock && (
          <div
            className="flex-shrink-0 rounded-lg px-3 py-2 text-center"
            style={{
              backgroundColor: zoneColor + "18",
              borderLeft: `3px solid ${zoneColor}`,
            }}
          >
            <p className="text-[10px] text-gray-500">실루엣</p>
            <p className="mt-0.5 text-base font-bold" style={{ color: zoneColor }}>
              {ZONE_LABEL[stock.zone]}
            </p>
            <p className="text-[10px] text-gray-500">Zone {stock.zone}</p>
          </div>
        )}
      </div>
    </div>
  );
}
