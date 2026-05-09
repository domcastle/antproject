"""
stock.py — 이승재 담당 라우터
prefix: /api/stock  (main.py include_router에서 부여)

엔드포인트
    GET /list               → 종목 리스트 (KOSPI 대형주 + M7)
    GET /{code}/ohlcv       → OHLCV + MA(5/20/60/120) + 볼린저밴드
    GET /{code}/supply      → 수급 (개인/외국인/기관 순매수)
    GET /{code}/valuation   → 밸류에이션 (PER/PBR/ROE/EPS)
    GET /{code}/silhouette  → 무릎-어깨 실루엣 5구간 판정
"""
import logging

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from services import data_collector, indicator, silhouette

logger = logging.getLogger(__name__)
router = APIRouter()


# ── GET /list ─────────────────────────────────────────────────────────────
# NOTE: /{code}/... 경로보다 먼저 등록해야 "list"가 path param으로 오인되지 않음

@router.get("/list")
def get_stock_list():
    """종목 리스트 (KOSPI 대형주 + M7). 15분 스케줄러 캐시."""
    return data_collector.get_stock_list()


# ── GET /{code}/ohlcv ─────────────────────────────────────────────────────

@router.get("/{code}/ohlcv")
def get_ohlcv(
    code: str,
    period: str = Query("1y", description="기간: 1y | 6m | 3m | 1m"),
):
    """
    OHLCV에 MA(5/20/60/120일 SMA)와 볼린저밴드(20일/2σ)를 합산해 반환.

    indicator.compute()는 항상 실행 — mock/live 구분 없이 단일 코드 패스.
    데이터 부족 초기 구간(예: ma120 앞 119행)은 해당 필드를 null로 반환.
    """
    ohlcv_raw = data_collector.get_ohlcv(code, period)
    if not ohlcv_raw:
        raise HTTPException(status_code=404, detail=f"OHLCV data not found: {code}")

    ohlcv_df   = pd.DataFrame(ohlcv_raw)
    indicators = indicator.compute(ohlcv_df)

    result = []
    for i, item in enumerate(ohlcv_raw):
        row = dict(item)
        row["ma5"]      = indicators["ma5"][i]
        row["ma20"]     = indicators["ma20"][i]
        row["ma60"]     = indicators["ma60"][i]
        row["ma120"]    = indicators["ma120"][i]
        row["bb_upper"] = indicators["bb_upper"][i]
        row["bb_lower"] = indicators["bb_lower"][i]
        result.append(row)

    return result


# ── GET /{code}/supply ────────────────────────────────────────────────────

@router.get("/{code}/supply")
def get_supply(code: str):
    """
    개인/외국인/기관 순매수 (만원 단위 정수, 최근 30일).
    US 종목(비숫자 code)은 data_collector에서 [] 즉시 반환.
    """
    return data_collector.get_supply(code)


# ── GET /{code}/valuation ─────────────────────────────────────────────────

@router.get("/{code}/valuation")
def get_valuation(code: str):
    """PER / PBR / ROE / EPS + 업종 PER + per·pbr·roe 신호 문자열."""
    return data_collector.get_valuation(code)


# ── GET /{code}/silhouette ────────────────────────────────────────────────

@router.get("/{code}/silhouette")
def get_silhouette(code: str):
    """
    무릎-어깨 실루엣 5구간 판정 + RSI 보정.
    1년치 OHLCV → indicator.compute() → silhouette.get_zone() 순으로 오케스트레이션.
    """
    ohlcv_raw = data_collector.get_ohlcv(code, "1y")
    if not ohlcv_raw:
        raise HTTPException(status_code=404, detail=f"OHLCV data not found: {code}")

    ohlcv_df   = pd.DataFrame(ohlcv_raw)
    indicators = indicator.compute(ohlcv_df)
    return silhouette.get_zone(ohlcv_df, indicators["rsi"])
