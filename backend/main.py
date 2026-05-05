"""
main.py — FastAPI 앱 진입점
- lifespan: KRX 로그인 → startup_fetch → 스케줄러 시작
- CORS 전체 허용 (allow_credentials=False — origins="*"일 때 True 불가)
- prefix는 include_router 등록 시 부여 (라우터 이식성 확보)
"""
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from constants import API_MODE, KRX_ID, KRX_PW, LOG_LEVEL
from routers import calendar, insight, market, stock
from services.data_collector import (
    last_fetched,
    register_scheduler_jobs,
    startup_fetch,
)

# ── 로깅 설정 ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── APScheduler 인스턴스 (lifespan 범위) ──────────────────────────────────
scheduler = AsyncIOScheduler()


# ── lifespan ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. KRX 로그인 — 실패해도 앱 부팅 계속
    if KRX_ID and KRX_PW:
        try:
            from pykrx import stock
            stock.set_krx_id(KRX_ID)
            stock.set_krx_password(KRX_PW)
            logger.info("KRX login success")
        except Exception as e:
            logger.warning(f"KRX login failed (non-fatal): {e}")
    else:
        logger.info("KRX credentials not set — skipping login")

    # 2. 초기 데이터 수집 (data_collector 소유)
    await startup_fetch()

    # 3. 스케줄러 Job 등록 후 시작
    register_scheduler_jobs(scheduler)
    scheduler.start()
    logger.info("Scheduler started")

    yield

    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")


# ── FastAPI 앱 생성 ───────────────────────────────────────────────────────
app = FastAPI(
    title="Ant Insight API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # origins="*"일 때 True 불가
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── 라우터 등록 (prefix는 여기서 부여) ───────────────────────────────────
app.include_router(market.router,   prefix="/api/market",   tags=["market"])
app.include_router(stock.router,    prefix="/api/stock",    tags=["stock"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])
app.include_router(insight.router,  prefix="/api/insight",  tags=["insight"])


# ── /api/health ───────────────────────────────────────────────────────────
@app.get("/api/health", tags=["health"])
def health() -> dict:
    def _fmt(dt: datetime | None) -> str | None:
        return dt.isoformat(timespec="seconds") if dt else None

    return {
        "status":                   "ok",
        "api_mode":                 API_MODE,
        "market_data_last_fetched": _fmt(last_fetched.get("market_data")),
        "fear_greed_last_fetched":  _fmt(last_fetched.get("fear_greed")),
        "timestamp":                datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
