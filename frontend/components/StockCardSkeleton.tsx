export default function StockCardSkeleton() {
  return (
    <div className="bg-[#0f1117] border border-[#1e2330] rounded-xl p-4 animate-pulse">
      {/* 종목명 + 존 인디케이터 */}
      <div className="flex items-start justify-between mb-2">
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-[#1e2330] rounded" />
          <div className="h-2.5 w-16 bg-[#1e2330] rounded" />
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#1e2330] mt-0.5 flex-shrink-0" />
      </div>

      {/* 현재가 */}
      <div className="mb-2 space-y-1.5">
        <div className="h-4 w-20 bg-[#1e2330] rounded" />
        <div className="h-3 w-28 bg-[#1e2330] rounded" />
      </div>

      {/* PER / PBR */}
      <div className="flex gap-3">
        <div className="h-2.5 w-12 bg-[#1e2330] rounded" />
        <div className="h-2.5 w-12 bg-[#1e2330] rounded" />
      </div>
    </div>
  );
}
