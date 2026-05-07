"""market.py — 박성원 담당 라우터
prefix: /api/market (main.py에서 부여)
"""
from fastapi import APIRouter

from services.data_collector import (
    get_exchange_rates,
    get_fear_greed_kr,
    get_fear_greed_us,
    get_indices,
    get_macro,
)

router = APIRouter()


@router.get("/exchange")
def exchange():
    """달러/유로/엔/위안/파운드 환율 (15분 캐시)."""
    return get_exchange_rates()


@router.get("/fear-greed/kr")
def fear_greed_kr():
    """국내 공포탐욕지수 — KOSPI200 실현변동성 기반 자체 계산 (1시간 캐시)."""
    return get_fear_greed_kr()


@router.get("/fear-greed/us")
def fear_greed_us():
    """미국 공포탐욕지수 — CNN Fear & Greed Index (1시간 캐시)."""
    return get_fear_greed_us()


@router.get("/indices")
def indices():
    """KOSPI / KOSDAQ / S&P500 / NASDAQ 지수 (15분 캐시)."""
    return get_indices()


@router.get("/macro")
def macro():
    """버핏지수 + M7 베타 (15분 캐시)."""
    return get_macro()
