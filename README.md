# UI 변환본 (uitest 브랜치용)

이 폴더의 내용을 기존 `frontend/`에 **그대로 덮어쓰기**하면 새 디자인이 적용됩니다.
기존 `lib/`(api.ts, mockData.ts, types/, constants.ts), `app/api/` 라우트, `package.json`, `tsconfig.json` 등은 **건드리지 않았습니다.**

## 변경/추가된 파일
```
frontend/
├── app/
│   ├── layout.tsx              ← 폰트 교체 (Pretendard + Plex Mono + Newsreader)
│   ├── globals.css             ← 디자인 토큰 + Tailwind v4 @theme
│   ├── page.tsx                ← 홈 화면 (사이드바 레이아웃)
│   ├── stock/[code]/page.tsx   ← 종목 상세
│   └── calendar/page.tsx       ← 개미의 달력
├── components/
│   ├── Sidebar.tsx             (신규)
│   ├── SectionTitle.tsx        (신규)
│   ├── ExchangeTicker.tsx      (재작성)
│   ├── FearGreedGauge.tsx      (재작성 — 반원 게이지 + 0/50/100 + EXTREME FEAR/GREED)
│   ├── BuffettGauge.tsx        (재작성)
│   ├── IndexCard.tsx           (신규 — 4분할 지수 카드 + 스파크라인)
│   ├── M7Card.tsx              (신규 — 베타 + 해석 라벨)
│   ├── StockListTable.tsx      (신규 — 종목 리스트 테이블)
│   ├── StockHeader.tsx         (재작성)
│   ├── SilhouettePanel.tsx     (재작성 — 사람 실루엣 PNG)
│   ├── CandleChart.tsx         (재작성 — MA 5/20/60/120 + 볼린저)
│   ├── SupplyChart.tsx         (재작성 — 5일 수급)
│   ├── ValuationCard.tsx       (재작성 — PER/PBR/ROE/EPS)
│   └── AiInsight.tsx           (재작성)
└── public/
    └── person-silhouette.png   (신규)
```

## 삭제 대상 (기존 컴포넌트)
새 컴포넌트로 대체된 아래 파일은 삭제하시면 됩니다:
- `components/StockCard.tsx`
- `components/StockCardSkeleton.tsx`

(StockListTable이 카드 그리드를 대체합니다.)

## 적용 절차
```bash
git checkout test
git checkout -b uitest

# 이 zip 압축 해제 후
cp -r frontend/* /path/to/repo/frontend/
rm frontend/components/StockCard.tsx frontend/components/StockCardSkeleton.tsx

git add .
git commit -m "feat: redesign UI — Ant Insight visual layer"
git push origin uitest
```

## 데이터 연동
기존 `lib/api.ts`, `lib/mockData.ts`, FastAPI 엔드포인트 호출 로직은 그대로 유지했습니다.
`NEXT_PUBLIC_API_URL` 미설정 시 mock으로 동작.

## 디자인 토큰
- 다크 베이스 `#0b0d12` / 골드 액센트 `#c8a464`
- 폰트: Pretendard (본문) + IBM Plex Mono (숫자) + Newsreader (헤드라인)
- 한국식 빨↑ / 파↓ (`--color-up: #ff5b5b`, `--color-down: #4a90ff`)
