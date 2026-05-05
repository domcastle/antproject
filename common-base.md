# Ant Insight — 공통 기반 파일 설계 문서

> 작성일: 2026-05-05  
> 팀: design-common-base (backend-architect · data-layer · schema-designer)  
> 대상: 7개 공통 기반 파일의 구조 및 설계 결정사항

---

## 1. 합의된 아키텍처 개요

```
main.py (lifespan)
  ├── KRX login (startup, non-fatal)
  ├── await startup_fetch()          ← data_collector.py 소유
  ├── register_scheduler_jobs(sched) ← data_collector.py 소유
  └── scheduler.start()

data_collector.py
  ├── _cache: Dict[str, Any]          ← 인메모리 캐시
  ├── startup_fetch() → async def     ← asyncio.to_thread() 내부 사용
  ├── register_scheduler_jobs(sched)
  ├── 스케줄러 3개 job
  │   ├── _refresh_market()     15분  (환율 + 지수 + 매크로)
  │   ├── _refresh_fear_greed() 1시간 (KR + US 공탐)
  │   └── _refresh_stock_list() 15분  (종목 리스트)
  ├── 공개 함수 (routers에서 호출)
  └── _with_fallback() helper  (4단계 폴백)

routers/ (각 담당자)
  ├── market.py  → data_collector.get_exchange_rates() 등
  ├── stock.py   → data_collector.get_ohlcv() → indicator.compute() → silhouette.get_zone()
  ├── insight.py → data_collector + gemini.py
  └── calendar.py → load_mock("calendar_2026.json") + d_day 계산

services/
  ├── indicator.py   (MA/RSI/BB 계산 — 이승재 담당)
  ├── silhouette.py  (5구간 판정 — 이승재 담당)
  └── gemini.py      (AI 인사이트 — 이승재 담당)
```

---

## 2. backend/constants.py — 최종 확정 내용

### 2.1 추가된 상수 (DEV_SPEC 대비)

| 상수 | 값 | 근거 |
|------|----|------|
| `API_MODE` | `os.getenv("API_MODE", "mock")` | 폴백 트리거 — data_collector에서 중앙 임포트 |
| `LOG_LEVEL` | `os.getenv("LOG_LEVEL", "INFO")` | 배포 로깅 제어 |
| `MOCK_DIR` | `"data/mock/"` | 경로 하드코딩 방지 |
| `KRX_ID`, `KRX_PW`, `GEMINI_API_KEY` | env vars | lifespan에서 사용 |
| `REALIZED_VOL_WINDOW` | `20` | KOSPI200 실현변동성 20일 log return |
| `MOMENTUM_WINDOW` | `20` | 모멘텀 계산 윈도우 |
| `TREND_WINDOW` | `20` | SMA20 기반 추세 괴리율 (rolling(20)) |
| `CACHE_KEY_MARKET`, `CACHE_KEY_FEAR_GREED` | 문자열 상수 | 오타 방지 |

### 2.2 수정 사항 (검토 중 발견)

| 항목 | 원래 오류 | 수정값 |
|------|----------|--------|
| KR F&G 가중치 | TREND=0.20, SAFE_ASSET=0.25, STOCK_STRENGTH·KOSDAQ 누락 | VKOSPI=0.30, MOMENTUM=0.25, STOCK_STRENGTH=0.15, TREND=0.15, KOSDAQ=0.10, SAFE_ASSET=0.05 |
| `KR_FG_SAFE_ASSET_BOND` | `"3Y"` (잘못된 형식) | `"국고채 3년"` (pykrx 기대값) |
| `EXCHANGE_TICKERS` | 단순 문자열 `"USDKRW=X"` | 중첩 dict `{"ticker": "USDKRW=X", "label": "달러"}` |
| `CNN_FG_HEADERS` | Chrome/124, Referer 없음 | Chrome/131, `"Referer": "https://edition.cnn.com/"` 추가 |
| `TREND_WINDOW` | 60 (잘못된 추정) | 20 (DEV_SPEC Section 5.3 `rolling(20)` 확인) |

### 2.3 최종 constants.py

```python
import os

# Scheduler intervals
POLL_INTERVAL_SEC: int = 900
INSIGHT_CACHE_SEC: int = 3600

# Runtime config
API_MODE: str = os.getenv("API_MODE", "mock")
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
MOCK_DIR: str = "data/mock/"

# Credentials
KRX_ID: str = os.getenv("KRX_ID", "")
KRX_PW: str = os.getenv("KRX_PW", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = "gemini-2.5-flash"

# Technical indicators
RSI_OVERBOUGHT: int = 70
RSI_OVERSOLD: int = 30
REALIZED_VOL_WINDOW: int = 20
MOMENTUM_WINDOW: int = 20
TREND_WINDOW: int = 20   # rolling(20) SMA 기반 추세 괴리율

# Buffett indicator
BUFFETT_UNDERVALUED: int = 70
BUFFETT_OVERVALUED: int = 100
BUFFETT_BUBBLE: int = 150

# Beta thresholds
BETA_HIGH: float = 1.5
BETA_LOW: float = 0.8

# KR Fear & Greed weights (6 components, sum = 1.00)
KR_FG_WEIGHT_VKOSPI: float = 0.30
KR_FG_WEIGHT_MOMENTUM: float = 0.25
KR_FG_WEIGHT_STOCK_STRENGTH: float = 0.15
KR_FG_WEIGHT_TREND: float = 0.15
KR_FG_WEIGHT_KOSDAQ: float = 0.10
KR_FG_WEIGHT_SAFE_ASSET: float = 0.05

# KR Fear & Greed normalization ranges
KR_FG_VKOSPI_MIN: float = 10.0
KR_FG_VKOSPI_MAX: float = 80.0
KR_FG_MOMENTUM_MIN: float = -5.0
KR_FG_MOMENTUM_MAX: float = 5.0
KR_FG_TREND_MIN: float = -10.0
KR_FG_TREND_MAX: float = 10.0
KR_FG_SAFE_ASSET_MIN: float = 1.0
KR_FG_SAFE_ASSET_MAX: float = 5.0
KR_FG_SAFE_ASSET_DEFAULT: float = 50.0
KR_FG_SAFE_ASSET_BOND: str = "국고채 3년"

# CNN Fear & Greed (스파이크 확정: Chrome/131 + Referer 필수)
CNN_FG_URL: str = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
CNN_FG_HEADERS: dict[str, str] = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Referer": "https://edition.cnn.com/",
}

# Index tickers (pykrx)
TICKER_KOSPI: str = "1001"
TICKER_KOSDAQ: str = "2001"
TICKER_KOSPI200: str = "1028"

# Exchange rate tickers — nested: ticker(yfinance) + label(UI 표시용)
EXCHANGE_TICKERS: dict[str, dict[str, str]] = {
    "USD": {"ticker": "USDKRW=X", "label": "달러"},
    "EUR": {"ticker": "EURKRW=X", "label": "유로"},
    "JPY": {"ticker": "JPYKRW=X", "label": "엔"},
    "CNY": {"ticker": "CNYKRW=X", "label": "위안"},
    "GBP": {"ticker": "GBPKRW=X", "label": "파운드"},
}

# Cache keys
CACHE_KEY_MARKET: str = "market"
CACHE_KEY_FEAR_GREED: str = "fear_greed"
```

---

## 3. backend/main.py — 최종 설계

### 3.1 lifespan 호출 순서

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. KRX login (실패해도 앱 부팅 계속)
    try:
        stock.set_krx_id(KRX_ID); stock.set_krx_password(KRX_PW)
    except Exception as e:
        logger.warning(f"KRX login failed: {e}")

    # 2. 초기 수집 (data_collector.py 소유)
    await startup_fetch()   # 실패 시 내부에서 mock 폴백

    # 3. 스케줄러 job 등록 후 시작
    register_scheduler_jobs(scheduler)
    scheduler.start()

    yield

    scheduler.shutdown(wait=False)
```

**설계 원칙**: startup 실패는 앱을 막지 않는다. 심사자가 API 키 없이도 접속 가능해야 함.

### 3.2 라우터 등록

```python
app.include_router(market.router,   prefix="/api/market",   tags=["market"])
app.include_router(stock.router,    prefix="/api/stock",    tags=["stock"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])
app.include_router(insight.router,  prefix="/api/insight",  tags=["insight"])
```

prefix는 라우터 파일이 아닌 등록 시 부여 — 라우터 파일 이식성 확보.

### 3.3 CORS 설정

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # origins="*"일 때 True 불가
    allow_methods=["GET", "POST"],   # POST /api/insight/{code} 필요
    allow_headers=["*"],
)
```

### 3.4 /api/health 응답

```python
{
    "status": "ok",
    "market_data_last_fetched": "2026-05-05T09:15:00Z",  # 또는 null
    "fear_greed_last_fetched":  "2026-05-05T09:00:00Z",  # 또는 null
    "api_mode": "live"
}
```

`last_fetched` dict는 data_collector.py가 소유하고 업데이트, main.py는 import해서 참조.

---

## 4. backend/services/data_collector.py — 최종 설계

### 4.1 캐시 구조

```python
_cache: Dict[str, Any] = {}

# 스케줄러 주도 키 (스케줄러가 신선도 책임)
_cache["exchange"]      = {"data": [...], "updated_at": datetime, "is_mock": bool}
_cache["fear_greed_kr"] = {"data": {...}, "updated_at": datetime, "is_mock": bool}
_cache["fear_greed_us"] = {"data": {...}, "updated_at": datetime, "is_mock": bool}
_cache["indices"]       = {"data": [...], "updated_at": datetime, "is_mock": bool}
_cache["macro"]         = {"data": {...}, "updated_at": datetime, "is_mock": bool}
_cache["stock_list"]    = {"data": [...], "updated_at": datetime, "is_mock": bool}

# On-demand 키 (TTL 30분)
_cache["ohlcv_005930_1y"] = {"data": [...], "updated_at": datetime, "is_mock": bool}
_cache["supply_005930"]   = {"data": [...], "updated_at": datetime, "is_mock": bool}
_cache["valuation_005930"]= {"data": {...}, "updated_at": datetime, "is_mock": bool}
```

### 4.2 TTL 전략

| 키 유형 | TTL 전략 |
|---------|---------|
| 스케줄러 주도 (exchange, indices 등) | TTL 없음 — 스케줄러가 주기적 갱신 |
| On-demand (ohlcv, supply, valuation) | 30분 TTL — 조회 시 만료 여부 확인 후 재수집 |

### 4.3 공개 함수 목록

```python
# 스케줄러 주도 (캐시 hit 즉시 반환)
def get_exchange_rates() -> List[dict]
def get_fear_greed_kr() -> dict     # KR 공탐지수 계산 포함 (입력값 동일 함수 내 수집)
def get_fear_greed_us() -> dict
def get_indices() -> List[dict]
def get_macro() -> dict             # 버핏지수 + M7 베타
def get_stock_list() -> List[dict]

# On-demand + TTL 캐시
def get_ohlcv(code: str, period: str = "1y") -> List[dict]
def get_supply(code: str) -> List[dict]   # 비숫자 code → [] 즉시 반환
def get_valuation(code: str) -> dict

# 진입점 (main.py에서 호출)
async def startup_fetch() -> None
def register_scheduler_jobs(scheduler: AsyncIOScheduler) -> None

# 유틸
def load_mock(filename: str) -> dict   # 파일 없으면 FileNotFoundError (묵살 금지)
```

### 4.4 APScheduler job (3개)

| Job | 함수 | 주기 | 갱신 대상 |
|-----|------|------|---------|
| market | `_refresh_market()` | 15분 | 환율 + 지수 + 매크로 |
| fear_greed | `_refresh_fear_greed()` | 1시간 | KR + US 공탐지수 |
| stock_list | `_refresh_stock_list()` | 15분 | 종목 리스트 (zone 포함) |

**per-stock OHLCV/supply/valuation은 pre-fetch 안 함** — 30종목 × 3 타입 = 90 API 호출/15분은 과도. On-demand + 30분 TTL로 충분.

### 4.5 async/sync 경계

```python
# pykrx/yfinance는 동기 블로킹 I/O → asyncio.to_thread()로 감싸기
async def _refresh_market():
    kospi = await asyncio.to_thread(_fetch_index_live, TICKER_KOSPI)
    rates = await asyncio.to_thread(_fetch_exchange_live)
    ...

# startup_fetch도 async def (lifespan에서 await)
async def startup_fetch():
    await asyncio.to_thread(_fetch_all_market_sync)
    await asyncio.to_thread(_fetch_fear_greed_sync)
```

AsyncIOScheduler가 async def job을 이벤트 루프에서 await — 이벤트 루프 블로킹 없음.

### 4.6 폴백 체계 (4단계)

```python
def _with_fallback(cache_key, fetch_fn, mock_file):
    if API_MODE == "mock":   # 단계 0: 강제 mock
        data = load_mock(mock_file)
        _cache[cache_key] = {"data": data, "updated_at": now(), "is_mock": True}
        return data

    try:                     # 단계 1: live 수집
        data = fetch_fn()
        _cache[cache_key] = {"data": data, "updated_at": now(), "is_mock": False}
        return data
    except Exception:
        pass

    if cache_key in _cache:  # 단계 2: 스테일 캐시
        return _cache[cache_key]["data"]

    try:                     # 단계 3: mock JSON
        data = load_mock(mock_file)
        _cache[cache_key] = {"data": data, "updated_at": now(), "is_mock": True}
        return data
    except FileNotFoundError:
        pass

    raise HTTPException(503) # 단계 4: 하드 실패
```

### 4.7 데이터 경계 (서비스 레이어)

```
data_collector.py  →  원시 데이터만 반환 (MA/RSI/BB 계산 안 함)
indicator.py       →  원시 OHLCV DataFrame 입력 → MA, RSI, BB 계산
silhouette.py      →  OHLCV + RSI 입력 → 5구간 + RSI 보정
gemini.py          →  종목 데이터 입력 → AI 인사이트

예외: get_fear_greed_kr()는 합성 점수 계산까지 포함
     (입력값 5개가 동일 함수 내 수집 → 별도 서비스로 분리할 이유 없음)
```

**라우터 오케스트레이션 패턴 (stock.py)**:
```python
ohlcv_raw  = data_collector.get_ohlcv(code, "1y")
ohlcv_df   = pd.DataFrame(ohlcv_raw)
indicators = indicator.compute(ohlcv_df)        # MA, RSI, BB
zone_info  = silhouette.get_zone(ohlcv_df, indicators["rsi"])
```

---

## 5. frontend/lib/types/index.ts — 추가/수정 사항

### 5.1 추가된 타입 (DEV_SPEC 누락분)

```typescript
// MacroResponse — DEV_SPEC에 없던 타입
export interface MacroResponse {
  buffett_index: number;
  buffett_status: BuffettStatus;
  m7_betas: Array<{
    code: string;
    name: string;
    beta: number;
  }>;
}

// StockListResponse
export type StockListResponse = StockListItem[];
```

나머지 타입은 DEV_SPEC Section 06 그대로 사용.

---

## 6. frontend/lib/api.ts — 수정 사항

### 6.1 fetchZone → fetchSilhouette (버그 수정)

DEV_SPEC Section 04 권위: `/api/stock/{code}/silhouette` 엔드포인트만 존재. Section 03의 `/zone` 참조는 문서 오류.

```typescript
// 수정 전 (DEV_SPEC 오류)
export const fetchZone = (code: string) => fetch(`${BASE}/api/stock/${code}/zone`);

// 수정 후
export const fetchSilhouette = (code: string) =>
  fetch(`${BASE}/api/stock/${code}/silhouette`);
```

HoverPanel은 전체 `SilhouetteResponse`가 필요 — 별도 `/zone` 경량 엔드포인트 불필요.

### 6.2 완성된 api.ts

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL;
const POLL = 900_000;

export const fetchFearGreedKR = () => fetch(`${BASE}/api/market/fear-greed/kr`);
export const fetchFearGreedUS = () => fetch(`${BASE}/api/market/fear-greed/us`);
export const fetchExchange    = () => fetch(`${BASE}/api/market/exchange`);
export const fetchIndices     = () => fetch(`${BASE}/api/market/indices`);
export const fetchMacro       = () => fetch(`${BASE}/api/market/macro`);
export const fetchStockList   = () => fetch(`${BASE}/api/stock/list`);
export const fetchSilhouette  = (code: string) => fetch(`${BASE}/api/stock/${code}/silhouette`);
export const fetchOhlcv       = (code: string, period = "1y") =>
  fetch(`${BASE}/api/stock/${code}/ohlcv?period=${period}`);
export const fetchSupply      = (code: string) => fetch(`${BASE}/api/stock/${code}/supply`);
export const fetchValuation   = (code: string) => fetch(`${BASE}/api/stock/${code}/valuation`);
export const fetchInsight     = (code: string) =>
  fetch(`${BASE}/api/insight/${code}`, { method: "POST" });
export const fetchCalendar    = (year: number, month: number) =>
  fetch(`${BASE}/api/calendar?year=${year}&month=${month}`);

export const SWR_POLL = { refreshInterval: POLL };
export const SWR_SLOW = { refreshInterval: POLL * 4 };
```

---

## 7. frontend/lib/constants.ts — 추가 사항

### 7.1 DEV_SPEC 원본 유지

```typescript
export const SILHOUETTE_COLORS: Record<number, string> = {
  1: "#3182f6", 2: "#54b8ff", 3: "#8b95a1", 4: "#ff8c42", 5: "#ff4d4d",
};
export const FEAR_GREED_COLORS: Record<string, string> = {
  extreme_fear: "#0d47a1", fear: "#1976d2", neutral: "#fafafa",
  greed: "#ffcc02", extreme_greed: "#ff4d4d",
};
export const BADGE_COLORS: Record<string, string> = {
  earnings: "#dbeafe", rate: "#fef3c7", cpi: "#fef9c3", witching: "#fee2e2",
};
```

### 7.2 추가 권장 상수

```typescript
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const SWR_SLOW = { refreshInterval: 3_600_000 };   // 1시간 (fear-greed용)
export const BUFFETT_THRESHOLDS = { undervalued: 70, neutral: 100, overvalued: 150 };
```

---

## 8. backend/data/mock/ — 최종 파일 목록

### 8.1 전역 파일 (7개)

| 파일명 | 대응 엔드포인트 | 비고 |
|--------|--------------|------|
| `exchange_mock.json` | GET /api/market/exchange | 5개 통화 |
| `fear_greed_kr_mock.json` | GET /api/market/fear-greed/kr | components 포함 |
| `us_fear_greed.json` | GET /api/market/fear-greed/us | 우리 API 응답 형식 |
| `indices_mock.json` | GET /api/market/indices | KOSPI/KOSDAQ/S&P500/NASDAQ |
| `stock_list_mock.json` | GET /api/stock/list | KR 상위 5종목 + M7 |
| `macro_mock.json` | GET /api/market/macro | 버핏지수 + M7 베타 |
| `calendar_2026.json` | GET /api/calendar | d_day 필드 없음 (백엔드 계산) |

### 8.2 per-stock 파일 (MVP: 005930 + AAPL)

| 파일명 | 내용 |
|--------|------|
| `krx_005930.json` | **120행** raw OHLCV (date, open, high, low, close, volume 만) |
| `m7_AAPL.json` | **120행** raw OHLCV 동일 |
| `supply_005930.json` | 30일 수급 (만원 단위 정수) |
| `valuation_005930.json` | PER/PBR/ROE/EPS + sector_per + signals |
| `silhouette_005930.json` | zone/signal_text/color/rsi/position_pct |
| `insight_005930.json` | summary/reason/disclaimer/cached |

**US 종목 supply mock 불필요**: `get_supply()`가 비숫자 code에 `return []` 즉시 반환.

### 8.3 핵심 스키마 결정

- **OHLCV mock**: MA/BB 필드 제외. indicator.py가 항상 실행 (단일 코드 패스).
- **OHLCV 최소 행 수**: 120행 (ma120 계산에 필요한 최소값).
- **calendar_2026.json**: `d_day` 필드 없음. 백엔드 라우터가 `(event_date - today).days`로 실시간 계산 — 심사 기간(5/14~5/28) 중 정확한 카운트다운 유지.

---

## 9. 주요 결정사항 요약

| 결정 | 선택 | 근거 |
|------|------|------|
| 캐싱 전략 | Pre-fetch + APScheduler | 첫 요청 즉시 응답 |
| 폴백 위치 | data_collector.py 내부 | 라우터 코드 단순화 |
| pykrx async 처리 | asyncio.to_thread() | 이벤트 루프 블로킹 방지 |
| per-stock pre-fetch | ❌ On-demand + 30분 TTL | 90 API 호출/15분 과도 |
| mock OHLCV 필드 | raw-only (MA/BB 제외) | 단일 코드 패스 = 테스트 신뢰도 |
| d_day 처리 | 백엔드 요청 시 계산 | 심사 기간 정확성 |
| /zone 엔드포인트 | /silhouette 통합 | 중복 코드 제거 |
| US supply | get_supply()에서 [] 즉시 반환 | mock 파일 7개 불필요 |
| KR F&G 계산 위치 | data_collector.py 내부 | 입력값 5개 동일 함수 내 수집 |

---

## 10. 미해결 이슈 / 트레이드오프

| 항목 | 상태 | 내용 |
|------|------|------|
| TREND_WINDOW 상수명 | 낮은 우선순위 | `TREND_WINDOW=20`이지만 이름이 모호 — `TREND_SMA_WINDOW`도 고려 가능 |
| Mock 종목 커버리지 | 허용된 트레이드오프 | MVP에서 005930 + AAPL만 커버. 다른 종목은 fallback chain을 거쳐 503 가능 — 필요 시 추가 |
| OHLCV period 파라미터 | 미확인 | mock 파일이 `1y`만 커버. `period=3m`, `6m` 요청 시 mock에 없어 503 가능 |
| KIS_API_KEY, FRED_API_KEY | constants.py 미포함 | DEV_SPEC에 있으나 현재 설계에서 미사용 — 필요 시 추가 |

---

## 11. 권장 구현 순서

1. `backend/constants.py` — 모든 상수 확정 후 공동 임포트 기반 마련
2. `backend/data/mock/` 전역 7개 파일 — 개발 시작 즉시 API 응답 가능
3. `backend/services/data_collector.py` — 캐시 구조 + 폴백 체계
4. `backend/main.py` — lifespan + CORS + health
5. `frontend/lib/types/index.ts` — 타입 확정 (양측 공동 검토 후 병합)
6. `frontend/lib/api.ts` + `frontend/lib/constants.ts`
7. `backend/data/mock/` per-stock 파일 (krx_005930, m7_AAPL 120행)

---

*설계 확정일: 2026-05-05 | 다음 작업: 구현 단계 진입*
