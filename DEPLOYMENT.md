# 배포 가이드

## 구성

| 역할 | 기술 | 플랫폼 |
|------|------|--------|
| Frontend | Next.js 16.2.0 | Vercel |
| Backend | FastAPI (Python) | Railway |

---

## 사전 준비

### CLI 설치
```bash
npm install -g @railway/cli vercel
```

### 로그인
각각 별도 터미널에서 실행 (브라우저 인증):
```bash
railway login
vercel login
```

---

## 백엔드 배포 (Railway)

### 1. 프로젝트 초기화
```bash
cd backend
railway init
```

### 2. 서비스 배포
```bash
railway up --detach
```

### 3. 서비스 연결
```bash
railway service <서비스명>
```

### 4. 환경변수 설정
```bash
railway variables set API_MODE=live
railway variables set LOG_LEVEL=INFO
railway variables set GEMINI_API_KEY=<키>
railway variables set KRX_ID=<아이디>
railway variables set "KRX_PW=<비밀번호>"
```

### 5. 도메인 생성
```bash
railway domain
# 출력 예: https://xxxx.up.railway.app
```

### 6. 재배포 (코드 변경 시)
Railway는 GitHub 자동 연동이 아니므로 변경 시 수동 재배포 필요:
```bash
railway up --detach
```

---

## 프론트엔드 배포 (Vercel)

### 1. 환경변수 파일 설정
`frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=https://xxxx.up.railway.app
```

> **주의:** 파일은 반드시 **UTF-8 (BOM 없음)** 으로 저장해야 함.
> BOM이 포함되면 URL 앞에 `%EF%BB%BF`가 붙어 API 호출이 실패함.

### 2. 최초 배포
```bash
cd frontend
vercel --yes
```

### 3. Vercel 환경변수 등록 (BOM 없이)
```bash
printf 'https://xxxx.up.railway.app' | vercel env add NEXT_PUBLIC_API_URL production
```

> `echo` 대신 `printf` 사용 — PowerShell `echo`는 BOM이 포함될 수 있음.

### 4. 프로덕션 재배포
```bash
vercel --prod
```

---

## 주요 트러블슈팅

### BOM 문제 (`%EF%BB%BF` URL 오류)
- **증상:** API 요청 URL이 `/%EF%BB%BFhttps:/...` 로 잘못 생성됨
- **원인:** `.env.local` 또는 Vercel env var에 UTF-8 BOM이 포함됨
- **해결:**
  1. `.vercelignore`에 `.env.local` 추가해 빌드에서 제외
  2. `printf`로 env var 재등록
  3. 코드에서 BOM 제거: `url.replace(/^﻿/, "")`

### KRX 로그인 오류 (`set_krx_id` 없음)
- **증상:** `module 'pykrx.stock' has no attribute 'set_krx_id'`
- **원인:** pykrx 1.2.8에서 해당 API 제거됨. 환경변수(`KRX_ID`, `KRX_PW`) 설정 시 pykrx가 자동 로그인 처리함
- **해결:** `main.py`의 수동 로그인 코드 제거

### 국고채 수익률 수집 실패 (`KeyError: '국고채 3년'`)
- **증상:** `bond fetch failed: KeyError: '국고채 3년'`
- **원인:** pykrx bond 티커명에 공백 불허
- **해결:** `constants.py`에서 `"국고채 3년"` → `"국고채3년"` 수정

### 프론트엔드 mock 데이터 고정 표시
- **증상:** live 모드인데도 mock 데이터가 표시됨
- **원인:** `page.tsx`에서 `NEXT_PUBLIC_API_URL` 미설정 시 `return`으로 조기 종료
- **해결:** `const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"` 으로 fallback 추가

---

## 배포 URL

| | URL |
|--|--|
| Frontend | https://frontend-zeta-brown-40.vercel.app |
| Backend | https://rare-friendship-production-3463.up.railway.app |
| Health Check | https://rare-friendship-production-3463.up.railway.app/api/health |

---

## 로컬 개발 실행

```bash
# 백엔드
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 프론트엔드
cd frontend
npm install
npm run dev
```

`frontend/.env.local`에 로컬 백엔드 주소 설정:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
