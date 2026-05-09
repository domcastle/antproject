"""
insight.py — 이승재 담당 라우터
prefix: /api/insight  (main.py include_router에서 부여)

엔드포인트
    POST /{code}  → Gemini AI 투자 방향성 인사이트

오케스트레이션 순서:
    1. OHLCV → indicator.compute() → silhouette.get_zone()  (RSI, zone, position_pct)
    2. data_collector.get_valuation()                        (PER/PBR/ROE/EPS)
    3. data_collector.get_supply() 최근 5일 합산             (수급 동향)
    4. data_collector.get_stock_list() 에서 현재가/등락률/종목명 조회
    5. gemini.get_insight(code, stock_data) 호출
"""
import logging

import pandas as pd
from fastapi import APIRouter, HTTPException

from services import data_collector, gemini, indicator, silhouette

logger = logging.getLogger(__name__)
router = APIRouter()


# ── POST /{code} ──────────────────────────────────────────────────────────

@router.post("/{code}")
def post_insight(code: str):
    """
    종목 데이터를 수집·조립해 Gemini 2.5 Flash 인사이트 반환.

    - 1시간 캐시 적용 (gemini.py 내부 관리)
    - API_MODE=mock 또는 GEMINI_API_KEY 미설정 시 mock JSON 반환
    - Gemini 호출 실패 시 mock JSON 폴백 (503 반환하지 않음)
    """
    # ── 1. OHLCV → 기술적 지표 → 실루엣 ──────────────────────────────────
    ohlcv_raw = data_collector.get_ohlcv(code, "1y")
    if not ohlcv_raw:
        raise HTTPException(status_code=404, detail=f"OHLCV data not found: {code}")

    ohlcv_df   = pd.DataFrame(ohlcv_raw)
    indicators = indicator.compute(ohlcv_df)
    zone_info  = silhouette.get_zone(ohlcv_df, indicators["rsi"])

    # ── 2. 밸류에이션 ─────────────────────────────────────────────────────
    try:
        valuation = data_collector.get_valuation(code)
    except Exception as e:
        logger.warning(f"valuation fetch failed [{code}]: {e}")
        valuation = {}

    # ── 3. 수급 — 최근 5일 합산 ──────────────────────────────────────────
    try:
        supply_list   = data_collector.get_supply(code)
        supply_recent = _sum_supply(supply_list[-5:]) if supply_list else {}
    except Exception as e:
        logger.warning(f"supply fetch failed [{code}]: {e}")
        supply_recent = {}

    # ── 4. 종목 기본 정보 (현재가, 등락률, 종목명) ────────────────────────
    stock_info = _find_stock_info(code)

    # ── 5. stock_data 조립 → gemini 호출 ─────────────────────────────────
    stock_data = {
        "code":         code,
        "name":         stock_info.get("name", code),
        "price":        stock_info.get("price"),
        "change_pct":   stock_info.get("change_pct"),
        "rsi":          zone_info.get("rsi"),
        "zone":         zone_info.get("zone"),
        "signal_text":  zone_info.get("signal_text"),
        "position_pct": zone_info.get("position_pct"),
        "per":          valuation.get("per"),
        "pbr":          valuation.get("pbr"),
        "roe":          valuation.get("roe"),
        "eps":          valuation.get("eps"),
        "supply_recent": supply_recent,
    }

    return gemini.get_insight(code, stock_data)


# ── 내부 유틸 ─────────────────────────────────────────────────────────────

def _sum_supply(rows: list[dict]) -> dict:
    """수급 리스트의 individual/foreign/institution 합산."""
    total = {"individual": 0, "foreign": 0, "institution": 0}
    for row in rows:
        total["individual"]  += row.get("individual",  0)
        total["foreign"]     += row.get("foreign",     0)
        total["institution"] += row.get("institution", 0)
    return total


def _find_stock_info(code: str) -> dict:
    """stock_list 캐시에서 해당 종목 기본 정보 조회. 없으면 빈 dict."""
    try:
        stock_list = data_collector.get_stock_list()
        return next((s for s in stock_list if s["code"] == code), {})
    except Exception as e:
        logger.warning(f"stock_list lookup failed [{code}]: {e}")
        return {}
