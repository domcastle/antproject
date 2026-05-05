# Ant Insight — 웹 서비스 개발 상세 명세서

> **Claude Code 활용 가이드**: 이 문서를 Claude Code 세션 시작 시 컨텍스트로 제공하세요.  
> 각 섹션 앞에 해당 섹션만 붙여넣고 작업을 요청하면 규칙에 맞는 코드가 자동 생성됩니다.

| 항목 | 내용 |
|------|------|
| 팀명 | 개미인사이트 |
| 서비스 | Ant Insight — Skills.md 기반 개미 투자자 투자 네비게이터 |
| 개발 기간 | 2026년 5월 1일 ~ 5월 14일 (2주) |
| 제출 마감 | 2026년 5월 14일 |
| 개발 인원 | 2인 (박성원, 이승재) |
| 개발 방식 | 바이브 코딩 (Claude Code 활용) |

---

## SECTION 01. 프로젝트 구조 및 기술 스택

### 1.1 전체 아키텍처

Skills.md를 Single Source of Truth로 두고, FastAPI 백엔드가 규칙을 실행하며 Next.js 프론트엔드가 렌더링합니다.

| 레이어 | 역할 | 기술 |
|--------|------|------|
| 프론트엔드 | UI 렌더링, 차트, 실루엣 컴포넌트, 라우팅 | Next.js 16.2 (App Router) + TypeScript 5.8 + Tailwind CSS 3.4 |
| 백엔드 API | 데이터 수집, 지표 계산, AI 인사이트 서빙 | Python 3.11 + FastAPI 0.136.1 + Pydantic v2 + uvicorn |
| 데이터 수집 | 주가/재무/거시 데이터 수집 및 캐싱 | yfinance 1.3.0 + pykrx 1.2.8 + httpx 0.28.1 + APScheduler 3.11.2 |
| 캐시/DB | API 응답 캐싱, Mock 데이터 저장 | 인메모리 dict + JSON 파일 기반 Mock |
| 배포 | 외부 접속 가능 URL (심사 기간 유지) | 프론트: Vercel / 백엔드: Railway 또는 Render |

### 1.2 디렉토리 구조

```
ant-insight/
├── frontend/                   # Next.js 프론트엔드
│   ├── app/
│   │   ├── page.tsx            # 메인 홈 (시장 요약)
│   │   ├── stock/[code]/       # 종목 상세 페이지
│   │   └── calendar/           # 개미의 달력
│   ├── components/
│   │   ├── FearGreedBg.tsx     # 공포탐욕 배경 컴포넌트
│   │   ├── ExchangeTicker.tsx  # 환율 자동 스크롤 티커 (메인 홈 상단)
│   │   ├── StockList.tsx       # 종목 리스트
│   │   ├── HoverPanel.tsx      # hover 실루엣 패널
│   │   ├── SilhouettePanel.tsx # 무릎-어깨 실루엣
│   │   ├── CandleChart.tsx     # 캔들 차트
│   │   ├── SupplyChart.tsx     # 수급 차트
│   │   ├── ValuationCard.tsx   # PER/PBR/ROE/EPS 카드
│   │   ├── AiInsight.tsx       # AI 투자 방향성
│   │   ├── Calendar.tsx        # 투자 이벤트 캘린더
│   │   ├── EventBadge.tsx      # 캘린더 이벤트 뱃지
│   │   └── WarningBanner.tsx   # 경고 배너
│   └── lib/
│       ├── api.ts              # 백엔드 API 호출 함수 (공동 관리)
│       ├── constants.ts        # 프론트 공유 상수 (공동 관리)
│       └── types/
│           └── index.ts        # 전체 API 응답 타입 (공동 관리)
│
├── backend/                    # FastAPI 백엔드
│   ├── main.py                 # FastAPI 앱 진입점
│   ├── constants.py            # 백엔드 공유 상수 (공동 관리)
│   ├── routers/
│   │   ├── market.py           # /api/market/* (박성원 담당 API)
│   │   ├── stock.py            # /api/stock/{code}/* (이승재 담당 API)
│   │   ├── calendar.py         # /api/calendar (박성원 담당 API)
│   │   └── insight.py          # /api/insight (이승재 담당 API)
│   ├── services/
│   │   ├── data_collector.py   # yfinance + pykrx 수집 (공동)
│   │   ├── indicator.py        # 지표 계산 (이승재) — Skills.md Ch2
│   │   ├── silhouette.py       # 실루엣 구간 판정 (이승재) — Skills.md Ch3
│   │   └── gemini.py           # Gemini API 연동 (이승재) — Skills.md Ch5
│   ├── data/mock/              # Mock JSON 데이터
│   ├── Skills.md               # 분석 규칙 원본
│   └── .env                    # API 키 (git 제외)
│
├── docs/                       # 참고 문서 (Claude Code 직접 참조 안 함)
│   ├── ant_insight_dev_spec_v6.pdf
│   ├── ant_insight_plan_v6.pdf
│   └── Skills_v11_from_md.pdf
│
└── README.md
```

---

## SECTION 02. 기술 스택 상세

### 2.1 프론트엔드 — package.json 고정 버전

```json
{
  "dependencies": {
    "next": "16.2.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "typescript": "5.8.3",
    "tailwindcss": "3.4.17",
    "recharts": "3.8.1",
    "motion": "12.9.4",
    "swr": "2.4.1",
    "date-fns": "4.1.0"
  }
}
```

> **주의**: Framer Motion은 `motion` 패키지로 리브랜딩됨. `npm i motion` 으로 설치.  
> `import { motion, AnimatePresence } from "motion/react"` 로 import.

### 2.2 백엔드 — requirements.txt 고정 버전

```
fastapi[standard]==0.136.1
uvicorn==0.34.2
pydantic==2.11.4
yfinance==1.3.0
pykrx==1.2.8
pandas==2.2.3
numpy==2.2.6
httpx==0.28.1
apscheduler==3.11.2
python-dotenv==1.1.0
google-genai==1.16.0
beautifulsoup4==4.12.3
```

> **[스파이크 확정]** pykrx `1.0.46` → `1.2.8` 업그레이드 필수. 구버전은 KRX API 응답 구조 변경으로 동작 불가.  
> **[스파이크 확정]** numpy 실제 설치 버전 `2.2.6` (명세 `2.2.4`와 상위 호환, 충돌 없음).  
> **주의**: `google-generativeai` (구 SDK)가 아닌 `google-genai` (신 SDK) 사용. `from google import genai`

### 2.3 외부 API 연동 명세

> **[스파이크 결과 반영]** 아래 표는 스파이크 완료 후 확정된 내용입니다.

| API | 키 필요 | 엔드포인트 / 방법 | 폴백 |
|-----|---------|-----------------|------|
| yfinance 1.3.0 | 불필요 | `yf.Ticker("AAPL").history(period="1y")` | `data/mock/m7_{code}.json` |
| yfinance 환율 | 불필요 | `yf.Ticker("USDKRW=X").history(period="1d", interval="1m")` — 달러/유로/엔/위안/파운드 | `data/mock/exchange_mock.json` |
| pykrx 1.2.8 | KRX 계정 필요 (`.env`에 `KRX_ID`, `KRX_PW`) | `stock.get_market_ohlcv()` / `get_market_trading_value_by_investor()` / `get_index_ohlcv()` | `data/mock/krx_{code}.json` |
| CNN Fear & Greed (미국) | 불필요 | `GET https://production.dataviz.cnn.io/index/fearandgreed/graphdata` — **User-Agent: Chrome 필수** | `data/mock/us_fear_greed.json` |
| VKOSPI | ❌ 수집 불가 | 네이버/yfinance/pykrx 모두 수집 불가 확인 → **KOSPI200 실현변동성으로 대체** | — |
| FRED API | 필요 (환경변수) | `GET https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key={KEY}` | `data/mock/fred_gdp.json` |
| Gemini 2.5 Flash | 필요 (환경변수) | `client.models.generate_content("gemini-2.5-flash", ...)` — **모델명 확정** | `data/mock/insight_{code}.json` |

> **KRX Open API**: 사용 안 함. pykrx 1.2.8 + KRX 일반 계정(ID/PW)으로 대체.  
> **한국투자증권 API**: `.env`에 `KIS_API_KEY`, `KIS_API_SECRET` 보조 수단으로 유지.

---

## SECTION 03. 기능별 개발 명세

### 3.1 메인 홈 — 시장 요약 대시보드 (박성원 담당)

| 컴포넌트 | 기능 상세 | Skills.md | API 엔드포인트 |
|---------|---------|-----------|--------------|
| `ExchangeTicker` | 메인 홈 최상단 — 달러/유로/엔/위안/파운드 환율 텍스트 우측 자동 스크롤. 표시 형식: "달러 1,479.70 -5.10 (0.34%)▼". 15분 갱신 | — | `GET /api/market/exchange` |
| `FearGreedBg` + 국내/미국 탭 | **[국내 탭]** 자체 계산 공탐지수 → VKOSPI(대체)×0.30 + 모멘텀×0.25 + 주가강도×0.15 + 추세×0.15 + KOSDAQ×0.10 + 안전자산×0.05 **[미국 탭]** CNN Fear & Greed 직접 수집. 탭 전환 시 배경 그라데이션 + 캐릭터 표정 연동. 각각 1시간 갱신 | Ch4.1 (국내/미국 분리) | `GET /api/market/fear-greed/kr` `GET /api/market/fear-greed/us` |
| `IndexCard ×4` | KOSPI / KOSDAQ / S&P500 / NASDAQ 현재가, 등락률, 60일 스파크라인. 15분 갱신 | Ch4.2 | `GET /api/market/indices` |
| `BuffettGauge` | 버핏 지수 게이지 (70/100/150 임계선). M7 평균 베타값 리스트 | Ch2.6 / Ch2.4 | `GET /api/market/macro` |
| `StockList + HoverPanel` | 종목 리스트 (현재가, 등락률, 거래금액). hover → 280px 실루엣 패널 슬라이드 인 (0.3s ease) | Ch3 / Ch4 | `GET /api/stock/list` / `GET /api/stock/{code}/zone` |

### 3.2 종목 상세 페이지 (이승재 담당)

| 컴포넌트 | 기능 상세 | Skills.md | API 엔드포인트 |
|---------|---------|-----------|--------------|
| `CandleChart` | 일/주/월/년 탭 전환 캔들 차트. 5/20/60/120일 이동평균선 오버레이. 볼린저 밴드 반투명 영역. 거래량 바 차트 | Ch2.1 / Ch2.3 / Ch4.2 | `GET /api/stock/{code}/ohlcv?period=1y&interval=1d` |
| `SupplyChart` | 실시간/일별 탭. 개인/외국인/기관 순매수 수평 막대 차트. 일별 테이블 | Ch4.2 | `GET /api/stock/{code}/supply` |
| `ValuationCard` | PER/PBR/ROE/EPS 수치 + 개미 친화 풀이 텍스트. 업종 평균 대비 판단 | Ch2.5 / Ch6.2 | `GET /api/stock/{code}/valuation` |
| `SilhouettePanel` | SVG 실루엣에 현재가 Dot + 펄스 애니메이션. RSI 보정 신호 텍스트 + 색상. 52주 위치 % 툴팁 | Ch3.1 / Ch3.2 / Ch3.3 | `GET /api/stock/{code}/silhouette` |
| `AiInsight` | Gemini API → 한 줄 요약 + 근거 3줄 + 면책 고지. 로딩 스피너. 실패 시 Mock 표시. 1시간 캐시 | Ch5.2 | `POST /api/insight/{code}` |

### 3.3 개미의 달력 (박성원 담당)

| 기능 | 상세 내용 | Skills.md | API |
|------|---------|-----------|-----|
| 월간 캘린더 | 실적 발표/금리/CPI/위칭데이 뱃지 표시. 날짜 클릭 → 이벤트 상세 팝업. D-Day 카운트다운 | Ch4.3 / Ch6.3 | `GET /api/calendar?year=2026&month=5` |
| 경고 배너 | 위칭데이 ±3일 / 공포탐욕 <20 / >80 → 화면 상단 고정 표시 | Ch6.3 | (캘린더 API 응답에 포함) |
| 데이터 소스 | `data/mock/calendar_2026.json` 하드코딩 | Ch1.2 | — |

---

## SECTION 04. 백엔드 API 엔드포인트 명세

모든 응답은 JSON. CORS는 전체 허용.

| 메서드 | 경로 | 설명 | 주요 응답 필드 |
|--------|------|------|--------------|
| GET | `/api/market/fear-greed/kr` | 국내 공포탐욕 지수 (자체 계산) | `score, status, components{vkospi/momentum/stock_strength/trend/kosdaq/safe_asset}, updated_at` |
| GET | `/api/market/exchange` | 주요 환율 (달러/유로/엔/위안/파운드) | `rates[]{currency, label, rate, change, change_pct, direction}` |
| GET | `/api/market/fear-greed/us` | 미국 공포탐욕 지수 (CNN) | `score, status, updated_at` |
| GET | `/api/market/indices` | KOSPI/KOSDAQ/S&P500/NASDAQ | `code, current, change_pct, sparkline[]` |
| GET | `/api/market/macro` | 버핏 지수, M7 베타 | `buffett_index, buffett_status, m7_betas[]` |
| GET | `/api/stock/list` | 종목 리스트 (KOSPI 대형주 + M7) | `code, name, price, change_pct, volume, zone` |
| GET | `/api/stock/{code}/ohlcv` | 종목 OHLCV + 이평선 + 볼린저 | `ohlcv[], ma5[], ma20[], ma60[], ma120[], bb_upper[], bb_lower[], volume[]` |
| GET | `/api/stock/{code}/supply` | 개인/외국인/기관 수급 | `date, individual, foreign, institution` (일별 리스트) |
| GET | `/api/stock/{code}/valuation` | PER/PBR/ROE/EPS + 업종 비교 | `per, pbr, roe, eps, eps_yoy, sector_per, signals{}` |
| GET | `/api/stock/{code}/silhouette` | 실루엣 구간 판정 | `zone(1~5), signal_text, color, rsi, position_pct` |
| POST | `/api/insight/{code}` | Gemini AI 투자 방향성 | `summary(20자), reason(3줄), disclaimer, cached` |
| GET | `/api/calendar` | 월별 투자 이벤트 | `events[]{date, type, title, badge_color, d_day}` |
| GET | `/api/health` | 서버 상태 확인 | `status: "ok", timestamp` |

---

## SECTION 05. 역할 분담 — 화면/기능 단위 기준

각 담당자가 화면(페이지) 단위로 FE 컴포넌트와 해당 BE API를 함께 책임집니다.

### 5.1 화면/기능 단위 역할 배분

| 화면 / 기능 | 담당 | FE 파일 | BE 파일 |
|------------|------|---------|---------|
| **① 스파이크** ✅ 완료 | 박성원 + 이승재 | ✅ Next.js 16 + Recharts 3.8.1 빌드 정상 / motion 12 `"motion/react"` import 정상 | ✅ 전 항목 확정 완료 (SECTION 05-3 참조) |
| **② 공통 기반** | 공동 | `types/index.ts` `lib/api.ts` `lib/constants.ts` `components/ui/*` | `main.py` `constants.py` `services/data_collector.py` `data/mock/` 전체 |
| **메인 홈 + hover 패널** | 박성원 | `app/page.tsx` `ExchangeTicker.tsx` `FearGreedBg.tsx` `IndexCard.tsx` `BuffettGauge.tsx` `StockList.tsx` `HoverPanel.tsx` | `routers/market.py` |
| **종목 상세 페이지** | 이승재 | `app/stock/[code]/page.tsx` `CandleChart.tsx` `SupplyChart.tsx` `SilhouettePanel.tsx` `ValuationCard.tsx` `AiInsight.tsx` | `routers/stock.py` + `routers/insight.py` |
| **개미의 달력 + 경고 배너** | 박성원 | `app/calendar/page.tsx` `Calendar.tsx` `EventBadge.tsx` `WarningBanner.tsx` | `routers/calendar.py` |
| **공통 서비스** | 이승재 | (FE 없음) | `services/indicator.py` `services/silhouette.py` `services/gemini.py` `.env` CORS 폴백 처리 |
| **배포** | 박성원: Vercel / 이승재: Railway | Vercel 환경변수 설정 | Railway `/api/health` 검증 |

### 5.2 스파이크 최종 결과 — 확정값 (2026-05-05)

> 스파이크 완료. 아래 확정값을 기반으로 공통 파일을 작성합니다.

#### 이승재 스파이크 확정값

| 항목 | 확정값 |
|------|--------|
| Python 버전 | 3.11.7 |
| pandas | 2.2.3 (명세와 동일) |
| numpy | 2.2.6 (명세 2.2.4, 상위 호환 — 충돌 없음) |
| pykrx | **1.2.8** (1.0.46 → 교체 필수) |
| yfinance OHLCV 컬럼 | `시가, 고가, 저가, 종가, 거래량, 등락률` (pykrx 국내) / `Open, High, Low, Close, Volume` (yfinance 미국) |
| yfinance .info 키명 | `trailingPE(PER)`, `priceToBook(PBR)`, `returnOnEquity(ROE)`, `trailingEps(EPS)` |
| pykrx 수급 컬럼 | `매도, 매수, 순매수` / 인덱스: `투자자구분` → `개인`, `외국인`, `기관합계` |
| pykrx PER/PBR/EPS | `get_market_fundamental_by_date()` → 컬럼: `BPS, PER, PBR, EPS, DIV, DPS` |
| ROE | pykrx 미제공 → yfinance `returnOnEquity`로 보완 |
| 지수 등락률 | `get_index_ohlcv()` — `등락률` 컬럼 없음 → **직접 계산**: `(종가[-1] - 종가[-2]) / 종가[-2] * 100` |
| 주요 지수 티커 | KOSPI: `1001` / KOSDAQ: `2001` / KOSPI200: `1028` |
| Gemini 모델명 | `gemini-2.5-flash` (확정) |
| CNN Fear&Greed 경로 | `data["fear_and_greed"]["score"]` / `data["fear_and_greed"]["rating"]` — **User-Agent Chrome 필수** |
| VKOSPI | ❌ 수집 불가 → **KOSPI200 실현변동성 대체**: `np.std(log_returns[-20:]) * np.sqrt(252) * 100` |
| 안전자산 수요 | ✅ pykrx bond 모듈로 수집 가능 → **국고채 3년 수익률** 사용 (`bond.get_otc_treasury_yields()`) |
| KRX 로그인 | `.env`에 `KRX_ID`, `KRX_PW` 필요 (카카오/네이버 소셜 로그인 불가, 일반 계정만 동작) |

#### 박성원 스파이크 확정값

| 항목 | 확정값 |
|------|--------|
| Next.js 16 + Recharts 3.8.1 | ✅ 빌드 정상 |
| motion 12 import 경로 | ✅ `import { motion, AnimatePresence } from "motion/react"` 정상 |
| SSR 이슈 | 없음 |

### 5.3 국내 공포탐욕지수 계산식 확정

```python
# 지표별 수집 방법 및 정규화 기준 (스파이크 확정)

# 01. VKOSPI 대체 — KOSPI200 실현변동성 (가중치 0.30)
df = stock.get_index_ohlcv("20260101", "20260430", "1028")  # KOSPI200
closes = df["종가"].values
log_returns = np.diff(np.log(closes))
realized_vol = np.std(log_returns[-20:]) * np.sqrt(252) * 100
vkospi_score = np.clip((realized_vol - 10) / (80 - 10) * 100, 0, 100)
# 역방향: 변동성 높을수록 공포 → 점수 반전: score = 100 - vkospi_score

# 02. 모멘텀 — KOSPI 등락률 (가중치 0.25)
df_kospi = stock.get_index_ohlcv(..., "1001")
kospi_change = (df_kospi["종가"].iloc[-1] - df_kospi["종가"].iloc[-2]) / df_kospi["종가"].iloc[-2] * 100
# normalize(kospi_change, min=-5.0, max=5.0)

# 03. KOSDAQ 등락률 (가중치 0.10)
df_kosdaq = stock.get_index_ohlcv(..., "2001")
kosdaq_change = (df_kosdaq["종가"].iloc[-1] - df_kosdaq["종가"].iloc[-2]) / df_kosdaq["종가"].iloc[-2] * 100

# 04. 주가강도 (가중치 0.15) — KOSPI + KOSDAQ 평균
stock_strength = (kospi_change + kosdaq_change) / 2

# 05. 안전자산 수요 (가중치 0.05) — pykrx bond 모듈로 수집
# 국고채 3년 수익률: 높을수록 안전자산 선호 → 공포 신호
from pykrx import bond
df_bond = bond.get_otc_treasury_yields("20260101", "20260430", "국고채 3년")
bond_yield = df_bond["수익률"].iloc[-1]  # 최근 수익률 (%)
# normalize(bond_yield, min=1.0, max=5.0) → 수익률 높을수록 공포(점수 높음)
safe_asset_score = normalize(bond_yield, 1.0, 5.0)
# 폴백: bond 모듈 오류 시 → safe_asset_score = 50.0 (Mock 고정값)

# 06. KOSPI 추세 (가중치 0.15) — 종가 vs 20일 이평 괴리율
sma20 = df_kospi["종가"].rolling(20).mean().iloc[-1]
trend_pct = (df_kospi["종가"].iloc[-1] - sma20) / sma20 * 100
# normalize(trend_pct, min=-10.0, max=10.0)

# FINAL SCORE
# score = vkospi×0.30 + momentum×0.25 + stock_strength×0.15 + trend×0.15 + kosdaq×0.10 + safe_asset×0.05
```

### 5.4 Claude Code 활용 전략

| 작업 | 담당 | Claude Code 프롬프트 전략 |
|------|------|--------------------------|
| 공통 타입 정의 | 공동 | Section 04 API 응답 필드 + Section 06의 타입 정의 붙여넣기 → `"이 스키마 기반으로 types/index.ts 작성해줘"` |
| 메인 홈 컴포넌트 | 박성원 | Skills.md Ch4.1 배경 컬러 규칙 주입 → `"FearGreedBg.tsx 작성해줘 / StockList에 HoverPanel 슬라이드 구현해줘"` |
| 환율 티커 컴포넌트 | 박성원 | `"ExchangeTicker.tsx 작성해줘. 달러/유로/엔/위안/파운드 환율을 우측 자동 스크롤로 표시. 형식: 달러 1,479.70 -5.10 (0.34%)▼"` |
| 종목 상세 컴포넌트 | 이승재 | Skills.md Ch2.1~2.3 주입 → `"CandleChart에 MA 오버레이, BB 반투명 영역 포함해서 작성해줘"` |
| 실루엣 로직 | 이승재 | Skills.md Ch3 전체 주입 → `"5구간 판정과 RSI 보정 포함해서 silhouette.py와 SilhouettePanel.tsx 작성해줘"` |
| Gemini 연동 | 이승재 | Skills.md Ch5 프롬프트 템플릿 주입 → `"gemini.py와 AiInsight.tsx 작성해줘"` |
| 캘린더 페이지 | 박성원 | Skills.md Ch4.3 뱃지 색상 + Ch6.3 경고 조건 주입 → `"Calendar.tsx와 WarningBanner.tsx 작성해줘"` |
| FastAPI 라우터 | 각 담당 | Section 04에서 담당 라우터 부분만 붙여넣기 → `"이 명세대로 routers/market.py 작성해줘"` |
| data_collector.py | 공동 | Section 05-2 확정값 전체 붙여넣기 → `"이 스파이크 결과 기반으로 data_collector.py 작성해줘"` |

---

## SECTION 06. 변수명 · 값 충돌 방지 규칙

두 사람이 각자 화면을 개발한 후 병합할 때 충돌이 없도록 아래 규칙을 개발 시작 전에 확정합니다.

### 6.1 공유 타입 — `types/index.ts` (단일 파일, 공동 관리)

모든 API 응답 타입은 이 파일에서만 정의합니다. 각 컴포넌트에서 인라인 타입 선언 금지.

```typescript
// types/index.ts — 공동 관리, 임의 수정 금지

// [파트 1] 공통 기본 타입
export type MarketType = "KR" | "US";
export type SilhouetteZone = 1 | 2 | 3 | 4 | 5;
export type FearGreedStatus =
  | "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
export type BuffettStatus =
  | "undervalued" | "neutral" | "overvalued" | "bubble";
export type EventType = "earnings" | "rate" | "cpi" | "witching";

// [파트 1-1] 환율 관련 타입
export type ExchangeDirection = "up" | "down" | "flat";
export interface ExchangeRate {
  currency: string;          // "USD" | "EUR" | "JPY" | "CNY" | "GBP"
  label: string;             // "달러" | "유로" | "엔" | "위안" | "파운드"
  rate: number;              // 현재 환율 (원화 기준)
  change: number;            // 전일 대비 변화량
  change_pct: number;        // 전일 대비 변화율 (소수점 2자리)
  direction: ExchangeDirection;
  updated_at: string;        // ISO 8601
}

// [파트 2] 메인 홈 관련 (박성원 담당 화면)
export interface FearGreedComponents {
  vkospi: number;          // KOSPI200 실현변동성 기반 정규화 (0~100, 역방향)
  momentum: number;        // KOSPI 등락률 정규화
  stock_strength: number;  // 주가강도 정규화
  trend: number;           // KOSPI 추세 정규화
  kosdaq: number;          // KOSDAQ 등락률 정규화
  safe_asset: number;      // 안전자산 수요 — 국고채 3년 수익률 정규화 (0~100)
}
export interface FearGreedResponse {
  score: number;
  status: FearGreedStatus;
  market: "KR" | "US";
  components?: FearGreedComponents;  // 국내(KR)만 존재
  updated_at: string;
}
export interface IndexCard {
  code: string;
  current: number;
  change_pct: number;
  sparkline: number[];
}
export interface StockListItem {
  code: string;
  name: string;
  market: MarketType;
  price: number;
  change_pct: number;
  volume: number;
  zone: SilhouetteZone;
}
export interface CalendarEvent {
  date: string;
  type: EventType;
  title: string;
  badge_color: string;
  d_day: number;
}

// [파트 3] 종목 상세 관련 (이승재 담당 화면)
export interface OhlcvItem {
  date: string;
  open: number; high: number; low: number; close: number;
  volume: number;
  ma5?: number; ma20?: number; ma60?: number; ma120?: number;
  bb_upper?: number; bb_lower?: number;
}
export interface SupplyItem {
  date: string;
  individual: number;   // 순매수 (만원, 음수=순매도) — pykrx "개인" 행 "순매수" 컬럼
  foreign: number;      // pykrx "외국인" 행
  institution: number;  // pykrx "기관합계" 행
}
export interface ValuationResponse {
  per: number | null;  pbr: number | null;
  roe: number | null;  eps: number | null;
  eps_yoy: number | null;
  sector_per: number | null;
  signals: { per: string; pbr: string; roe: string };
}
export interface SilhouetteResponse {
  zone: SilhouetteZone;
  signal_text: string;
  color: string;
  rsi: number;
  position_pct: number;
}
export interface InsightResponse {
  summary: string;
  reason: string;
  disclaimer: string;
  cached: boolean;
}
```

### 6.2 API 클라이언트 — `lib/api.ts` (단일 파일, 공동 관리)

백엔드 호출 함수는 이 파일에서만 정의합니다. 컴포넌트 내부에서 `fetch` 직접 호출 금지.

```typescript
// lib/api.ts — 공동 관리
const BASE = process.env.NEXT_PUBLIC_API_URL;
const POLL = 900_000;  // 15분

export const fetchFearGreedKR = () => fetch(`${BASE}/api/market/fear-greed/kr`);
export const fetchFearGreedUS = () => fetch(`${BASE}/api/market/fear-greed/us`);
export const fetchExchange    = () => fetch(`${BASE}/api/market/exchange`);
export const fetchIndices    = () => fetch(`${BASE}/api/market/indices`);
export const fetchMacro      = () => fetch(`${BASE}/api/market/macro`);
export const fetchStockList  = () => fetch(`${BASE}/api/stock/list`);
export const fetchZone       = (code: string) => fetch(`${BASE}/api/stock/${code}/zone`);
export const fetchOhlcv      = (code: string, period = "1y") =>
  fetch(`${BASE}/api/stock/${code}/ohlcv?period=${period}`);
export const fetchSupply     = (code: string) => fetch(`${BASE}/api/stock/${code}/supply`);
export const fetchValuation  = (code: string) => fetch(`${BASE}/api/stock/${code}/valuation`);
export const fetchSilhouette = (code: string) => fetch(`${BASE}/api/stock/${code}/silhouette`);
export const fetchInsight    = (code: string) =>
  fetch(`${BASE}/api/insight/${code}`, { method: "POST" });
export const fetchCalendar   = (year: number, month: number) =>
  fetch(`${BASE}/api/calendar?year=${year}&month=${month}`);

export const SWR_POLL = { refreshInterval: POLL };
export const SWR_SLOW = { refreshInterval: POLL * 4 };
```

### 6.3 백엔드 응답 키 네이밍 규칙

| 규칙 | 올바른 예 | 금지 예 |
|------|---------|---------|
| 키 이름: snake_case | `change_pct, signal_text, eps_yoy` | `changePct, SignalText` |
| 날짜: ISO 8601 문자열 | `"2026-05-07"` (YYYY-MM-DD) | `"07/05/2026"`, `"20260507"` |
| 등락률: 소수 실수 | `change_pct: -2.44` | `change_pct: "-2.44%"` |
| 금액: 정수 (만원 단위) | `individual: 6603714` | 원 단위 사용 금지 |
| 결측값: null (생략 금지) | `"per": null` | `"per": 0` 또는 키 자체 생략 |
| 색상: 소문자 hex | `"color": "#3182f6"` | `"#3182F6"` 또는 `"blue"` |
| 불리언: true/false | `"cached": true` | `"cached": 1` 또는 `"Y"` |

### 6.4 공유 상수 — 절대 중복 선언 금지

```python
# backend/constants.py — 이승재 관리
POLL_INTERVAL_SEC   = 900
INSIGHT_CACHE_SEC   = 3600
SILHOUETTE_ZONES    = 5
RSI_OVERBOUGHT      = 70
RSI_OVERSOLD        = 30
BUFFETT_UNDERVALUED = 70
BUFFETT_OVERVALUED  = 100
BUFFETT_BUBBLE      = 150
BETA_HIGH           = 1.5
BETA_LOW            = 0.8

# 국내 공포탐욕 지수 가중치 (합계 = 1.0)
KR_FG_WEIGHT_VKOSPI         = 0.30
KR_FG_WEIGHT_MOMENTUM       = 0.25
KR_FG_WEIGHT_STOCK_STRENGTH = 0.15
KR_FG_WEIGHT_TREND          = 0.15
KR_FG_WEIGHT_KOSDAQ         = 0.10
KR_FG_WEIGHT_SAFE_ASSET     = 0.05

# 정규화 기준값 (스파이크 확정)
KR_FG_MOMENTUM_MIN   = -5.0
KR_FG_MOMENTUM_MAX   =  5.0
KR_FG_VKOSPI_MIN     =  10.0   # KOSPI200 실현변동성 하한
KR_FG_VKOSPI_MAX     =  80.0   # KOSPI200 실현변동성 상한 (구 50.0 → 80.0으로 수정)
KR_FG_TREND_MIN      = -10.0
KR_FG_TREND_MAX      =  10.0
KR_FG_SAFE_ASSET_BOND   = "국고채 3년"   # pykrx bond 모듈 조회 종목
KR_FG_SAFE_ASSET_MIN    = 1.0            # 국고채 3년 수익률 정규화 하한 (%)
KR_FG_SAFE_ASSET_MAX    = 5.0            # 국고채 3년 수익률 정규화 상한 (%)
KR_FG_SAFE_ASSET_DEFAULT = 50.0          # bond 모듈 오류 시 폴백 고정값

# CNN Fear&Greed (스파이크 확정)
CNN_FG_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
CNN_FG_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Referer": "https://edition.cnn.com/",
}

# pykrx 지수 티커 (스파이크 확정)
TICKER_KOSPI    = "1001"
TICKER_KOSDAQ   = "2001"
TICKER_KOSPI200 = "1028"

# Gemini 모델명 (스파이크 확정)
GEMINI_MODEL = "gemini-2.5-flash"

# 환율 티커 — yfinance (스파이크 확정)
EXCHANGE_TICKERS = {
    "USD": {"ticker": "USDKRW=X", "label": "달러"},
    "EUR": {"ticker": "EURKRW=X", "label": "유로"},
    "JPY": {"ticker": "JPYKRW=X", "label": "엔"},
    "CNY": {"ticker": "CNYKRW=X", "label": "위안"},
    "GBP": {"ticker": "GBPKRW=X", "label": "파운드"},
}
```

```typescript
// frontend/lib/constants.ts — 박성원 관리
export const SILHOUETTE_COLORS: Record<number, string> = {
  1: "#3182f6",
  2: "#54b8ff",
  3: "#8b95a1",
  4: "#ff8c42",
  5: "#ff4d4d",
};
export const FEAR_GREED_COLORS: Record<string, string> = {
  extreme_fear:  "#0d47a1",
  fear:          "#1976d2",
  neutral:       "#fafafa",
  greed:         "#ffcc02",
  extreme_greed: "#ff4d4d",
};
export const BADGE_COLORS: Record<string, string> = {
  earnings: "#dbeafe",
  rate:     "#fef3c7",
  cpi:      "#fef9c3",
  witching: "#fee2e2",
};
```

### 6.5 .env 키 목록 (확정)

```
# Gemini
GEMINI_API_KEY=xxx

# pykrx KRX 로그인 (일반 계정, 소셜 로그인 불가)
KRX_ID=xxx
KRX_PW=xxx

# 한국투자증권 (보조)
KIS_API_KEY=xxx
KIS_API_SECRET=xxx

# FRED
FRED_API_KEY=xxx

# 배포 모드
API_MODE=live   # live | mock
```

### 6.6 Git 브랜치 전략

| 브랜치 | 용도 | 규칙 |
|--------|------|------|
| `main` | 배포 브랜치 | 직접 커밋 금지. PR merge만 허용 |
| `develop` | 통합 브랜치 | 각자 작업 브랜치를 여기로 PR. 하루 1~2회 merge |
| `psw/feature-*` | 박성원 작업 | `psw/feature-main-home`, `psw/feature-calendar` 형식 |
| `lsj/feature-*` | 이승재 작업 | `lsj/feature-stock-detail`, `lsj/feature-indicator` 형식 |
| 공통 파일 수정 | `types/index.ts` `lib/api.ts` `constants.ts` | 반드시 상대방과 사전 합의 후 수정. 단독 수정 금지 |

---

## SECTION 07. 2주 개발 스프린트 일정

| 일정 | 박성원 (메인 홈 + 캘린더) | 이승재 (종목 상세 + 공통 서비스) |
|------|------------------------|-------------------------------|
| **5/1~5/5 공통 기반 + 스파이크** ✅ | `types/index.ts` / `lib/api.ts` / `constants.ts` / Mock JSON 스키마 확정 | FastAPI 세팅 + CORS / `data_collector.py` / Mock JSON / `.env` 확정 / **스파이크 완료** |
| **5/5 ~ 5/7 [5/7 Skills.md 제출]** | `app/page.tsx` 레이아웃 / `FearGreedBg.tsx` / `IndexCard.tsx` / `BuffettGauge.tsx` / `StockList.tsx` / `HoverPanel.tsx` / Skills.md 최종 검수 | `indicator.py` (MA/RSI/BB/베타) / `silhouette.py` (5구간+RSI 보정) / `CandleChart.tsx` / `SilhouettePanel.tsx` / `ValuationCard.tsx` / `/api/stock/{code}/ohlcv, /valuation, /silhouette` |
| **5/8 ~ 5/10** | `app/calendar/page.tsx` / `Calendar.tsx` / `EventBadge.tsx` / `WarningBanner.tsx` / `routers/calendar.py` | `SupplyChart.tsx` / `AiInsight.tsx` / `gemini.py` / `routers/insight.py` + `routers/market.py` 연동 |
| **5/11 ~ 5/12** | 전체 페이지 연결 점검 / 반응형 레이아웃 / Vercel 배포 | CORS / 예외처리 / 폴백 정리 / Railway 배포 / `/api/health` 검증 |
| **5/13 ~ 5/14 [QA + 제출]** | 심사자 시나리오 QA / Mock 폴백 확인 | 통합 테스트 / 배포 URL 확인 / Github 정리 → 제출 |

### Mock 데이터 우선 개발 원칙

모든 엔드포인트는 Mock JSON을 먼저 반환하는 방식으로 개발 시작.  
`API_MODE=mock` 환경변수로 전환 가능하게 설계.  
Mock 응답 스키마는 `types/index.ts`와 완전히 일치해야 합니다.

---

## SECTION 08. 배포 전략 및 제출 체크리스트

### 8.1 배포 구성

| 대상 | 플랫폼 | URL | 환경변수 |
|------|--------|-----|---------|
| 프론트엔드 | Vercel (무료) | `https://ant-insight.vercel.app` | `NEXT_PUBLIC_API_URL=백엔드URL` |
| 백엔드 | Railway 또는 Render (무료) | `https://ant-insight-api.railway.app` | `GEMINI_API_KEY` `KRX_ID` `KRX_PW` `KIS_API_KEY` `KIS_API_SECRET` `FRED_API_KEY` `API_MODE=live` |

### 8.2 심사자 접속 시나리오 검증 체크리스트

- [ ] 외부 URL 접속 가능 — 이승재
- [ ] 환율 티커 스크롤 동작 (달러/유로/엔/위안/파운드 자동 스크롤, 15분 갱신) — 박성원
- [ ] API 키 없이 동작 (클라이언트 노출 없음) — 이승재
- [ ] Gemini API 폴백 (`API_MODE=mock` Mock 인사이트 표시) — 이승재
- [ ] 국내 공탐 배경 (KOSPI200 실현변동성 기반 배경 그라데이션, components 필드 확인) — 박성원
- [ ] 미국 공탐 배경 (CNN 기반 배경 전환, 탭 애니메이션) — 박성원
- [ ] 실루엣 hover 패널 (슬라이드 패널 동작) — 박성원
- [ ] 종목 상세 전체 기능 (005930 / AAPL → 차트, 수급, 실루엣, AI) — 이승재
- [ ] 캘린더 표시 (이벤트 뱃지, 경고 배너) — 박성원
- [ ] Mock 스키마 일치 (TypeScript 빌드 오류 없음) — 공동
- [ ] 데이터 기준일 표시 (Mock 전환 시 UI 하단 표시) — 이승재
- [ ] 심사 기간 URL 유지 (슬립 방지 설정) — 이승재

### 8.3 최종 제출물 목록

| 제출물 | 파일/링크 | 담당 |
|--------|---------|------|
| 기획서 | `docs/ant_insight_plan_v6.pdf` | 박성원 |
| Skills.md (zip) | `Skills.md` + `Skills_v11_final.pdf` → zip | 박성원 |
| 배포 URL (필수) | `https://ant-insight.vercel.app` | 이승재 |
| Github 링크 (선택) | `https://github.com/[팀명]/ant-insight` | 공동 |

---

*최종 업데이트: 2026-05-05 (스파이크 결과 반영 / 환율 티커 추가 / 안전자산 수요 pykrx bond 모듈로 수정)*
