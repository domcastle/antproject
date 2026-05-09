import Link from "next/link";
import { CandleChart }      from "@/components/CandleChart";
import { SupplyChart }      from "@/components/SupplyChart";
import { SilhouettePanel }  from "@/components/SilhouettePanel";
import { ValuationCard }    from "@/components/ValuationCard";
import { AiInsight }        from "@/components/AiInsight";
import { StockHeader }      from "@/components/StockHeader";

// ── Metadata ───────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return {
    title:       `${code} — 개미인사이트`,
    description: `${code} 종목 캔들 차트, 실루엣 구간, 수급 분석, AI 투자 방향성`,
  };
}

// ── Page ───────────────────────────────────────────────────────────────
export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">

      {/* ── Sticky nav ── */}
      <nav className="sticky top-0 z-20 border-b border-gray-800/50 bg-[#0d1117]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-100"
          >
            {/* left-arrow icon */}
            <svg
              width="15" height="15"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M19 12H5M5 12l7 7M5 12l7-7" />
            </svg>
            홈으로
          </Link>
          <span className="text-gray-700">·</span>
          <span className="text-sm font-semibold text-gray-300">개미인사이트</span>
        </div>
      </nav>

      {/* ── Stock header ── */}
      <StockHeader code={code} />

      {/* ── Main content ── */}
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">

        {/* 1. 캔들 차트 (full-width) */}
        <section>
          <CandleChart code={code} />
        </section>

        {/* 2. 실루엣 + 투자지표 (2-col on lg, stacked on mobile) */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SilhouettePanel code={code} />
          <ValuationCard   code={code} />
        </section>

        {/* 3. 수급 차트 (full-width) */}
        <section>
          <SupplyChart code={code} />
        </section>

        {/* 4. AI 투자 방향성 (full-width) */}
        <section>
          <AiInsight code={code} />
        </section>

        {/* ── Footer disclaimer ── */}
        <footer className="pb-8 pt-2 text-center text-[11px] leading-relaxed text-gray-700">
          본 서비스의 모든 분석 결과는 투자 참고용 정보이며, 투자 권유 또는 금융 조언이 아닙니다.
          <br />
          투자의 최종 판단과 책임은 투자자 본인에게 있습니다. © 2026 개미인사이트
        </footer>
      </main>
    </div>
  );
}
