# 박성원 파트 구현 목록

> 작성일: 2026-05-07  
> 브랜치: park  
> 기준 문서: DEV_SPEC.md · common-base.md

---

## Backend (`antproject/backend/`)

### 1. `routers/market.py`
- **상태**: ✅ 완료
- **담당 엔드포인트**:
  | 메서드 | 경로 | 설명 |
  |--------|------|------|
  | GET | `/api/market/exchange` | 달러/유로/엔/위안/파운드 환율 |
  | GET | `/api/market/fear-greed/kr` | 국내 공포탐욕지수 (KOSPI200 실현변동성 기반) |
  | GET | `/api/market/fear-greed/us` | 미국 공포탐욕지수 (CNN Fear & Greed) |
  | GET | `/api/market/indices` | KOSPI / KOSDAQ / S&P500 / NASDAQ |
  | GET | `/api/market/macro` | 버핏지수 + M7 베타 |
- **구현 방식**: `services/data_collector.py`의 공개 함수 직접 호출 (4단계 폴백 체계 내장)

---

### 2. `routers/calendar.py`
- **상태**: ✅ 완료
- **담당 엔드포인트**:
  | 메서드 | 경로 | 설명 |
  |--------|------|------|
  | GET | `/api/calendar?year=2026&month=5` | 월별 투자 이벤트 목록 |
- **구현 방식**:
  - `data/mock/calendar_2026.json` 로드 (하드코딩 데이터소스)
  - `year` / `month` 쿼리 파라미터로 필터링
  - `d_day` 필드를 요청 시점 기준으로 실시간 계산 → 심사 기간(5/14~5/28) 중 카운트다운 정확
- **응답 스키마**: `{ events: [ { date, type, title, badge_color, d_day } ] }`

---

### 3. `data/mock/exchange_mock.json` (버그 수정)
- **상태**: ✅ 수정 완료
- **수정 내용**: `{ "rates": [...] }` 래퍼 제거 → 플랫 리스트 `[...]`로 변경
- **이유**: `_fetch_exchange_live()`가 리스트를 반환하는데 Mock이 객체 래퍼를 반환 → 스키마 불일치. Mock/Live 코드 패스 통일.

---

## Frontend (`antproject/` — Next.js)

### 4. `lib/api.ts` (신규 생성)
- **상태**: ✅ 완료
- **내용**: FastAPI 백엔드 호출 함수 전체 정의 (common-base.md §6.2 확정버전 기준)
- **주요 함수**:
  ```typescript
  fetchFearGreedKR()    // GET /api/market/fear-greed/kr
  fetchFearGreedUS()    // GET /api/market/fear-greed/us
  fetchExchange()       // GET /api/market/exchange
  fetchIndices()        // GET /api/market/indices
  fetchMacro()          // GET /api/market/macro
  fetchStockList()      // GET /api/stock/list
  fetchSilhouette(code) // GET /api/stock/{code}/silhouette  ← /zone 아님 (DEV_SPEC 버그 수정)
  fetchOhlcv(code, period)
  fetchSupply(code)
  fetchValuation(code)
  fetchInsight(code)    // POST /api/insight/{code}
  fetchCalendar(year, month)
  SWR_POLL              // 15분
  SWR_SLOW              // 1시간
  ```
- **BASE URL**: `process.env.NEXT_PUBLIC_API_URL` (미설정 시 빈 문자열 — 로컬 폴백)

---

### 5. `lib/constants.ts` (신규 생성)
- **상태**: ✅ 완료
- **내용**: DEV_SPEC §6.4 공유 상수 (프론트엔드)
  ```typescript
  SILHOUETTE_COLORS    // 구간 1~5 hex 색상
  FEAR_GREED_COLORS    // extreme_fear / fear / neutral / greed / extreme_greed
  BADGE_COLORS         // earnings / rate / cpi / witching
  API_BASE             // NEXT_PUBLIC_API_URL fallback
  BUFFETT_THRESHOLDS   // { undervalued: 70, neutral: 100, overvalued: 150 }
  ```

---

### 6. `components/ExchangeTicker.tsx` (신규 생성)
- **상태**: ✅ 완료
- **기능**: 메인 홈 최상단 환율 자동 스크롤 티커
- **표시 형식**: `달러 1,379.50 -5.10 (-0.37%)▼ | 유로 ... | ...`
- **구현 특징**:
  - CSS `@keyframes ticker-scroll` 무한 루프 (35초 1사이클)
  - 아이템 2벌 복사로 심리스(seamless) 루프 구현
  - hover 시 `animation-play-state: paused` — 읽기 편의
  - `NEXT_PUBLIC_API_URL` 설정 시 FastAPI 실데이터 fetch (15분 주기 갱신)
  - 미연결 시 하드코딩 Mock 자동 폴백 (서비스 중단 없음)

---

### 7. `app/page.tsx` (업데이트)
- **상태**: ✅ 완료
- **변경 내용**:
  1. **ExchangeTicker 추가**: 네비게이션 바 바로 아래, 메인 콘텐츠 위에 배치
  2. **공포탐욕 KR/US 탭 추가**:
     - 🇺🇸 미국 탭: 기존 CNN Fear & Greed (Next.js 로컬 `/api/fear-greed` 경유)
     - 🇰🇷 국내 탭: FastAPI `/api/market/fear-greed/kr` 직접 호출 (Mock 폴백 포함)
     - 국내 탭 선택 시 VKOSPI / 모멘텀 / 주가강도 / 추세 / KOSDAQ / 안전자산 6개 컴포넌트 바 차트 표시
  3. **Mock 표시 배너**: 각 탭에서 실데이터 미연결 시 `⚠ Mock 표시 중` 안내
  4. **배경 그라데이션**: 활성 탭의 공탐 점수 기준으로 동적 변경
  5. **FastAPI 지수 연동** (⑤ 우선순위: FastAPI → Yahoo Finance → mock):
     - `GET /api/market/indices` 응답 병합 — `apiIndices` 상태 → `mergedIndices` 계산
     - FastAPI 응답 `{code, current, change_pct}` → change 절댓값 계산 후 목록 업데이트
  6. **FastAPI 종목 리스트 연동** (Yahoo Finance 우선, FastAPI 차선):
     - `GET /api/stock/list` 응답 병합 — `apiStockList` 상태 → `mergedStocks` 계산
     - zone 값: FastAPI silhouette 결과 우선 / 없으면 52주 위치 로컬 계산
  7. **FastAPI 매크로 연동 + M7 베타 리스트 표시**:
     - `GET /api/market/macro` 응답 → `apiMacro.m7_betas` 배열 렌더링
     - 미연결 시 `BUFFETT_M7_MOCK` (Apple/MSFT/Alphabet/Amazon/Meta/NVIDIA/Tesla) 폴백
     - beta ≥ 1.5 → 빨강, beta < 0.8 → 파랑, 그 외 → 회색 색상 코딩
     - 버핏 지수 카드 하단에 4열 그리드로 배치, Live/Mock 표시 뱃지 포함
  8. **경고 배너 동적화**:
     - 공탐 점수 < 20 → 극도공포 경고
     - 공탐 점수 > 80 → 극도과열 경고
     - 선물/옵션 만기일 ±3일 이내 → 변동성 경고 (현재 날짜 기준 실시간 계산)

---

### 8. `app/calendar/page.tsx` (업데이트)
- **상태**: ✅ 완료
- **변경 내용**:
  1. **D-Day 동적화**: 하드코딩 `new Date('2026-05-02')` → `new Date()` + `setHours(0,0,0,0)` 로 오늘 날짜 기준
  2. **isToday 동적화**: `dateStr === todayStr` (현재 날짜 기준)
  3. **upcomingEvents 동적화**: `>= today` (현재 날짜 기준)
  4. **클릭 팝업 모달**: 날짜 셀 / 사이드바 이벤트 클릭 시 상세 팝업 표시
     - backdrop 클릭 + ✕ 버튼으로 닫기
     - `selectedDate` 상태로 제어
  5. **동적 경고 배너**: `/api/fear-greed` fetch → 공탐 점수 기반 경고 + witching ±3일 경고
     - 경고 없을 시 "✅ 현재 특별한 시장 경고 없음" 표시

---

## 미구현 (이승재 담당)

| 파일 | 상태 |
|------|------|
| `backend/routers/stock.py` | 스텁 — 이승재 구현 예정 |
| `backend/routers/insight.py` | 스텁 — 이승재 구현 예정 |
| `backend/services/indicator.py` | 미생성 — 이승재 구현 예정 |
| `backend/services/silhouette.py` | 미생성 — 이승재 구현 예정 |
| `backend/services/gemini.py` | 미생성 — 이승재 구현 예정 |
| `components/CandleChart.tsx` | 이승재 담당 |
| `components/SupplyChart.tsx` | 이승재 담당 |
| `components/SilhouettePanel.tsx` | 이승재 담당 |
| `components/ValuationCard.tsx` | 이승재 담당 |
| `components/AiInsight.tsx` | 이승재 담당 |
| `app/stock/[code]/page.tsx` | 이승재 담당 (기존 스텁 존재) |

---

## 배포 체크리스트 (박성원 담당)

- [ ] Vercel 환경변수 설정: `NEXT_PUBLIC_API_URL=https://ant-insight-api.railway.app`
- [ ] ExchangeTicker 스크롤 동작 확인 (달러/유로/엔/위안/파운드)
- [ ] 국내/미국 공탐 탭 전환 동작 확인
- [ ] 실루엣 hover 패널 슬라이드 확인 (StockCard 내 구현 완료)
- [ ] 캘린더 이벤트 뱃지 / D-Day 카운트다운 확인
- [ ] Mock 폴백 확인 (`API_MODE=mock` 또는 백엔드 미연결 시)

---

*최종 업데이트: 2026-05-07 (M7 베타 연동 + calendar 팝업 + 동적 경고 배너 반영)*
