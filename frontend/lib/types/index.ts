// types/index.ts — 공동 관리, 임의 수정 금지
// 모든 API 응답 타입은 이 파일에서만 정의. 컴포넌트 내 인라인 타입 선언 금지.

// ── [파트 1] 공통 기본 타입 ─────────────────────────────────────────────
export type MarketType       = "KR" | "US";
export type SilhouetteZone   = 1 | 2 | 3 | 4 | 5;
export type FearGreedStatus  = "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
export type BuffettStatus    = "undervalued" | "neutral" | "overvalued" | "bubble";
export type EventType        = "earnings" | "rate" | "cpi" | "witching";
export type ExchangeDirection = "up" | "down" | "flat";

// ── [파트 1-1] 환율 ──────────────────────────────────────────────────────
export interface ExchangeRate {
  currency:   string;           // "USD" | "EUR" | "JPY" | "CNY" | "GBP"
  label:      string;           // "달러" | "유로" | "엔" | "위안" | "파운드"
  rate:       number;           // 현재 환율 (원화 기준)
  change:     number;           // 전일 대비 변화량
  change_pct: number;           // 전일 대비 변화율 (소수점 2자리)
  direction:  ExchangeDirection;
  updated_at: string;           // ISO 8601
}

export interface ExchangeResponse {
  rates: ExchangeRate[];
}

// ── [파트 2] 메인 홈 관련 (박성원 담당 화면) ─────────────────────────────
export interface FearGreedComponents {
  vkospi:         number;  // KOSPI200 실현변동성 기반 정규화 (0~100, 역방향)
  momentum:       number;  // KOSPI 등락률 정규화
  stock_strength: number;  // 주가강도 정규화
  trend:          number;  // KOSPI 추세 정규화
  kosdaq:         number;  // KOSDAQ 등락률 정규화
  safe_asset:     number;  // 안전자산 수요 — 국고채 3년 수익률 정규화 (0~100)
}

export interface FearGreedResponse {
  score:       number;
  status:      FearGreedStatus;
  market:      "KR" | "US";
  components?: FearGreedComponents;  // 국내(KR)만 존재
  updated_at:  string;
}

export interface IndexCard {
  code:       string;
  current:    number;
  change_pct: number;
  sparkline:  number[];
}

export interface MacroResponse {
  buffett_index:  number;
  buffett_status: BuffettStatus;
  m7_betas: Array<{
    code: string;
    name: string;
    beta: number;
  }>;
}

export interface StockListItem {
  code:       string;
  name:       string;
  market:     MarketType;
  price:      number;
  change_pct: number;
  volume:     number;
  zone:       SilhouetteZone;
}

export type StockListResponse = StockListItem[];

export interface CalendarEvent {
  date:        string;
  type:        EventType;
  title:       string;
  badge_color: string;
  d_day:       number;
}

// ── [파트 3] 종목 상세 관련 (이승재 담당 화면) ──────────────────────────
export interface OhlcvItem {
  date:       string;
  open:       number;
  high:       number;
  low:        number;
  close:      number;
  volume:     number;
  ma5?:       number;
  ma20?:      number;
  ma60?:      number;
  ma120?:     number;
  bb_upper?:  number;
  bb_lower?:  number;
}

export interface SupplyItem {
  date:        string;
  individual:  number;   // 순매수 (만원, 음수=순매도) — pykrx "개인" 행 "순매수" 컬럼
  foreign:     number;   // pykrx "외국인" 행
  institution: number;   // pykrx "기관합계" 행
}

export interface ValuationResponse {
  per:        number | null;
  pbr:        number | null;
  roe:        number | null;
  eps:        number | null;
  eps_yoy:    number | null;
  sector_per: number | null;
  signals:    { per: string; pbr: string; roe: string };
}

export interface SilhouetteResponse {
  zone:         SilhouetteZone;
  signal_text:  string;
  color:        string;
  rsi:          number;
  position_pct: number;
}

export interface InsightResponse {
  summary:     string;
  reason:      string;
  disclaimer:  string;
  cached:      boolean;
}
