# 🐜 Ant Insight — 개미 투자자 투자 네비게이터

> **Skills.md 기반**으로 국내외 시장을 분석하고, 공포탐욕 지수·실루엣 구간·AI 인사이트를 한눈에 제공하는 개미 친화형 투자 대시보드입니다.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Deploy FE](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://ant-insight.vercel.app)
[![Deploy BE](https://img.shields.io/badge/Deploy-Railway-6441a5?logo=railway)](https://ant-insight-api.railway.app)

---

## 📌 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 팀명 | 개미인사이트 |
| 개발 기간 | 2026년 5월 1일 ~ 5월 14일 (2주) |
| 개발 인원 | 2인 (박성원, 이승재) |
| 개발 방식 | 바이브 코딩 (Claude Code 활용) |
| 배포 URL | https://ant-insight.vercel.app |

---

## 🖥️ 주요 기능

### 메인 홈 — 시장 요약 대시보드
- **국내/미국 공포탐욕 지수** — 탭 전환 시 배경 그라데이션 + 캐릭터 표정 연동
  - 국내: VKOSPI×0.30 + 모멘텀×0.25 + 주가강도×0.15 + 추세×0.15 + KOSDAQ×0.10 + 안전자산×0.05
  - 미국: CNN Fear & Greed 직접 수집
- **지수 카드** — KOSPI / KOSDAQ / S&P500 / NASDAQ 현재가, 등락률, 60일 스파크라인
- **버핏 지수 게이지** — 70/100/150 임계선 + M7 평균 베타값
- **종목 리스트** — hover 시 실루엣 패널 슬라이드 인 (0.3s ease)

### 종목 상세 페이지
- **캔들 차트** — 일/주/월/년 탭 전환, 5/20/60/120일 이동평균선, 볼린저 밴드
- **수급 차트** — 개인/외국인/기관 순매수 수평 막대 차트
- **밸류에이션 카드** — PER/PBR/ROE/EPS + 업종 평균 대비 판단 텍스트
- **실루엣 패널** — SVG 실루엣에 현재가 Dot + 펄스 애니메이션, RSI 보정 신호
- **AI 인사이트** — Gemini 2.5 Flash 기반 한 줄 요약 + 근거 3줄

### 개미의 달력
- 실적 발표 / 금리 / CPI / 위칭데이 뱃지 표시
- 날짜 클릭 → 이벤트 상세 팝업, D-Day 카운트다운
- 공포탐욕 \<20 / >80, 위칭데이 ±3일 경고 배너

---

## 🏗️ 아키텍처

```
Skills.md (Single Source of Truth)
        │
        ▼
┌───────────────┐     ┌─────────────────────┐
│  Next.js 16   │────▶│    FastAPI (Python)  │
│  (Vercel)     │     │    (Railway)         │
└───────────────┘     └─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
           pykrx          yfinance       Gemini API
        (국내 주가)       (미국 주가)     (AI 인사이트)
```

---

## 🛠️ 기술 스택

### Frontend
| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| Next.js | 16.2.x | App Router, SSR/CSR |
| TypeScript | 5.8.x | 타입 안전성 |
| Tailwind CSS | 3.4.x | 유틸리티 CSS |
| Recharts | 3.8.1 | 캔들/바/스파크라인 차트 |
| motion | 12.x | 실루엣 슬라이드 애니메이션 |
| SWR | 2.4.1 | 15분 자동 폴링 |

### Backend
| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| FastAPI | 0.136.1 | REST API 서버 |
| pykrx | 1.0.46 | 국내 주가·수급 데이터 |
| yfinance | 1.3.0 | 미국 주가·재무 지표 |
| pandas / numpy | 2.2.3 / 2.2.4 | 지표 계산 |
| google-genai | 1.16.x | Gemini 2.5 Flash |
| APScheduler | 3.11.2 | 15분 폴링 스케줄러 |

---

## 📁 디렉토리 구조

```
ant-insight/
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # 메인 홈 (시장 요약)
│   │   ├── stock/[code]/         # 종목 상세 페이지
│   │   └── calendar/             # 개미의 달력
│   ├── components/
│   │   ├── FearGreedBg.tsx       # 공포탐욕 배경
│   │   ├── StockList.tsx         # 종목 리스트 + hover 패널
│   │   ├── SilhouettePanel.tsx   # 무릎-어깨 실루엣
│   │   ├── CandleChart.tsx       # 캔들 차트
│   │   ├── SupplyChart.tsx       # 수급 차트
│   │   ├── ValuationCard.tsx     # PER/PBR/ROE/EPS 카드
│   │   ├── AiInsight.tsx         # AI 투자 방향성
│   │   └── Calendar.tsx          # 투자 이벤트 캘린더
│   └── lib/
│       ├── api.ts                # 백엔드 API 호출 함수
│       └── constants.ts          # 공유 상수 (색상, 임계값)
│
├── backend/
│   ├── main.py                   # FastAPI 앱 진입점
│   ├── routers/
│   │   ├── market.py             # /api/market/*
│   │   ├── stock.py              # /api/stock/{code}
│   │   ├── calendar.py           # /api/calendar
│   │   └── insight.py            # /api/insight (Gemini)
│   ├── services/
│   │   ├── data_collector.py     # yfinance + pykrx 수집
│   │   ├── indicator.py          # MA/RSI/BB/베타 계산
│   │   ├── silhouette.py         # 5구간 + RSI 보정
│   │   └── gemini.py             # Gemini API 연동
│   ├── data/mock/                # Mock JSON 데이터
│   ├── Skills.md                 # 분석 규칙 원본
│   └── .env                      # API 키 (git 제외)
│
└── README.md
```

---

## 🚀 로컬 실행

### 사전 준비
`.env` 파일을 `backend/` 디렉토리에 생성합니다.

```env
GEMINI_API_KEY=your_gemini_api_key
FRED_API_KEY=your_fred_api_key
KRX_API_KEY=your_krx_api_key
KIS_API_KEY=your_kis_api_key
KIS_API_SECRET=your_kis_api_secret
API_MODE=live   # mock 으로 변경 시 Mock 데이터 사용
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# .env.local 생성
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

## 🔌 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/market/fear-greed/kr` | 국내 공포탐욕 지수 |
| GET | `/api/market/fear-greed/us` | 미국 공포탐욕 지수 (CNN) |
| GET | `/api/market/indices` | KOSPI/KOSDAQ/S&P500/NASDAQ |
| GET | `/api/market/macro` | 버핏 지수, M7 베타 |
| GET | `/api/stock/list` | 종목 리스트 |
| GET | `/api/stock/{code}/ohlcv` | OHLCV + 이평선 + 볼린저 |
| GET | `/api/stock/{code}/supply` | 개인/외국인/기관 수급 |
| GET | `/api/stock/{code}/valuation` | PER/PBR/ROE/EPS |
| GET | `/api/stock/{code}/silhouette` | 실루엣 구간 판정 |
| POST | `/api/insight/{code}` | Gemini AI 투자 방향성 |
| GET | `/api/calendar` | 월별 투자 이벤트 |
| GET | `/api/health` | 서버 상태 확인 |

> 전체 Swagger 문서: `http://localhost:8000/docs`

---

## 📊 데이터 소스

| 데이터 | 방법 | 비고 |
|--------|------|------|
| KOSPI/KOSDAQ 지수 OHLCV | pykrx `get_index_ohlcv` | KRX 로그인 필요 |
| 개별 종목 OHLCV | pykrx `get_market_ohlcv` | — |
| 수급 (개인/외국인/기관) | pykrx `get_market_trading_value_by_investor` | — |
| PER/PBR/EPS | pykrx `get_market_fundamental_by_date` | — |
| VKOSPI | KOSPI200 20일 실현변동성으로 대체 | 근사값 |
| 미국 공포탐욕 | CNN Fear & Greed API | — |
| 미국 주가/재무 | yfinance | — |
| AI 인사이트 | Gemini 2.5 Flash | 1시간 캐시 |

---

## 🧑‍💻 역할 분담

| 담당 | 영역 |
|------|------|
| 박성원 | 메인 홈, 개미의 달력, 경고 배너, Vercel 배포 |
| 이승재 | 종목 상세, 공통 서비스(지표/실루엣/AI), Railway 배포 |

---

## 📅 스프린트 일정

| 기간 | 주요 작업 |
|------|----------|
| 5/1 | 스파이크 검증, 공통 기반 (types, api.ts, mock JSON) |
| 5/2 ~ 5/4 | 메인 홈 레이아웃, indicator/silhouette 서비스 |
| 5/5 ~ 5/7 | HoverPanel, market API 연동, CandleChart, SilhouettePanel |
| 5/8 ~ 5/10 | 캘린더 페이지, SupplyChart, AiInsight, Gemini 연동 |
| 5/11 ~ 5/12 | 전체 연결 점검, 반응형 정리, Vercel/Railway 배포 |
| 5/13 ~ 5/14 | QA, Mock 폴백 확인, 최종 제출 |

---

## ⚙️ 환경 변수 목록

| 변수 | 위치 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` | 백엔드 API 주소 |
| `GEMINI_API_KEY` | backend `.env` | Gemini 2.5 Flash |
| `FRED_API_KEY` | backend `.env` | FRED 거시 데이터 |
| `KRX_API_KEY` | backend `.env` | KRX Open API |
| `KIS_API_KEY` / `KIS_API_SECRET` | backend `.env` | 한국투자증권 Open API |
| `API_MODE` | backend `.env` | `live` / `mock` 전환 |

---

## 📝 라이선스

본 프로젝트는 팀 내부 해커톤 제출용입니다.
