"use client";

import React from "react";
import { motion } from "motion/react";
import useSWR from "swr";
import { fetchInsight, SWR_SLOW } from "@/lib/api";
import type { InsightResponse } from "@/lib/types";

// ── Loading animations ─────────────────────────────────────────────────
function Spinner() {
  return (
    <motion.div
      className="h-7 w-7 rounded-full border-2 border-blue-500/25 border-t-blue-400"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    />
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
        />
      ))}
    </span>
  );
}

// ── Reason list ────────────────────────────────────────────────────────
// backend returns reason as newline-separated string (3 lines)
function ReasonList({ reason }: { reason: string }) {
  const lines = reason
    .split("\n")
    .map(l => l.replace(/^[\d①②③•\-\s]+/, "").trim())
    .filter(Boolean);

  const NUMS = ["①", "②", "③", "④", "⑤"];

  return (
    <ol className="space-y-2">
      {lines.map((line, i) => (
        <motion.li
          key={i}
          className="flex gap-2.5 text-sm leading-relaxed text-gray-300"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.08 }}
        >
          <span className="mt-0.5 flex-shrink-0 text-[13px] font-bold text-blue-400">
            {NUMS[i] ?? "•"}
          </span>
          <span>{line}</span>
        </motion.li>
      ))}
    </ol>
  );
}

// ── Main component ─────────────────────────────────────────────────────
interface Props { code: string }

export function AiInsight({ code }: Props) {
  const {
    data,
    isLoading,
    error,
    mutate,
  } = useSWR<InsightResponse>(
    `insight/${code}`,
    () =>
      fetchInsight(code).then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<InsightResponse>;
      }),
    {
      ...SWR_SLOW,
      revalidateOnFocus:     false,
      revalidateOnReconnect: false,
      shouldRetryOnError:    false,
    },
  );

  return (
    <div className="rounded-xl bg-[#131722] p-4">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-300">
            🤖&nbsp; AI 투자 방향성
          </h3>
          <p className="mt-0.5 text-[10px] text-gray-600">
            Powered by Gemini 2.5 Flash
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.cached && (
            <span className="rounded border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-500">
              캐시됨
            </span>
          )}
          <button
            onClick={() => mutate()}
            disabled={isLoading}
            title="다시 생성"
            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300 disabled:opacity-40"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Spinner />
          <div className="text-center">
            <p className="text-sm text-gray-400">
              AI 분석 생성 중&nbsp;
              <TypingDots />
            </p>
            <p className="mt-1 text-[11px] text-gray-600">
              Gemini가 차트·재무·수급 데이터를 종합합니다
            </p>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="text-3xl">⚠️</span>
          <div>
            <p className="text-sm text-gray-400">AI 분석을 불러올 수 없습니다</p>
            <p className="mt-1 text-[11px] text-gray-600">
              서버 오류 또는 API 한도 초과일 수 있습니다
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* ── Success ── */}
      {!isLoading && !error && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-lg border border-blue-500/20 bg-blue-500/8 p-4"
          >
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-blue-400">
              한 줄 요약
            </p>
            <p className="text-sm font-medium leading-relaxed text-gray-100">
              {data.summary}
            </p>
          </motion.div>

          {/* Reasons */}
          <div>
            <p className="mb-2.5 text-[11px] font-semibold text-gray-500">
              분석 근거
            </p>
            <ReasonList reason={data.reason} />
          </div>

          {/* Disclaimer */}
          <div className="border-t border-gray-800 pt-3">
            <p className="text-[10px] leading-relaxed text-gray-600">
              ⚠️&nbsp;{data.disclaimer}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
