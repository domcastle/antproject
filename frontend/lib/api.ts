// api.ts — 공동 관리
// 백엔드 호출 함수는 이 파일에서만 정의. 컴포넌트 내부 fetch 직접 호출 금지.
// fetchZone → fetchSilhouette 수정: /zone 엔드포인트 없음, /silhouette 통합 (common-base.md 6.1)

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POLL = 900_000; // 15분

export const fetchFearGreedKR = () => fetch(`${BASE}/api/market/fear-greed/kr`);
export const fetchFearGreedUS = () => fetch(`${BASE}/api/market/fear-greed/us`);
export const fetchExchange    = () => fetch(`${BASE}/api/market/exchange`);
export const fetchIndices     = () => fetch(`${BASE}/api/market/indices`);
export const fetchMacro       = () => fetch(`${BASE}/api/market/macro`);
export const fetchStockList   = () => fetch(`${BASE}/api/stock/list`);
export const fetchSilhouette  = (code: string) =>
  fetch(`${BASE}/api/stock/${code}/silhouette`);
export const fetchOhlcv = (code: string, period = "1y") =>
  fetch(`${BASE}/api/stock/${code}/ohlcv?period=${period}`);
export const fetchSupply    = (code: string) => fetch(`${BASE}/api/stock/${code}/supply`);
export const fetchValuation = (code: string) => fetch(`${BASE}/api/stock/${code}/valuation`);
export const fetchInsight   = (code: string) =>
  fetch(`${BASE}/api/insight/${code}`, { method: "POST" });
export const fetchMarketInsight = (body: {
  indices: { name: string; value: number; change_pct: number }[];
  fear_greed_kr: { score: number; status: string };
  fear_greed_us: { score: number; status: string };
  buffett: { value: number; status: string };
}) =>
  fetch(`${BASE}/api/insight/market`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export const fetchCalendar  = (year: number, month: number) =>
  fetch(`${BASE}/api/calendar?year=${year}&month=${month}`);

// SWR 갱신 주기
export const SWR_POLL = { refreshInterval: POLL };          // 15분 — 시장 데이터
export const SWR_SLOW = { refreshInterval: POLL * 4 };     // 1시간 — fear-greed
