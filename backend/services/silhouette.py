"""
silhouette.py — 무릎-어깨 실루엣 5구간 판정 + RSI 보정 (이승재 담당)
Skills.md Ch3.1 / Ch3.2 / Ch3.3 기반

구간 기준: 52주 고저 대비 현재가 위치 (position_pct)
    Zone 1 (  0 ~ 20%) 발목 — 강력 매수 구간
    Zone 2 ( 20 ~ 40%) 무릎 — 매수 고려 구간
    Zone 3 ( 40 ~ 60%) 허리 — 중립 관망 구간
    Zone 4 ( 60 ~ 80%) 어깨 — 매도 고려 구간
    Zone 5 ( 80 ~100%) 머리 — 강력 매도 구간

RSI 보정 (Ch3.2):
    Zone 1~2 + RSI >= 70 → signal_text에 "※ RSI 과매수 주의" 부기
    Zone 4~5 + RSI <= 30 → signal_text에 "※ RSI 과매도 — 반등 가능" 부기

라우터 오케스트레이션 패턴 (stock.py):
    ohlcv_df   = pd.DataFrame(data_collector.get_ohlcv(code, "1y"))
    indicators = indicator.compute(ohlcv_df)
    zone_info  = silhouette.get_zone(ohlcv_df, indicators["rsi"])
"""
import logging

import numpy as np
import pandas as pd

from constants import RSI_OVERBOUGHT, RSI_OVERSOLD

logger = logging.getLogger(__name__)

# 52주 거래일 기준 (영업일 약 252일)
_YEARLY_TRADING_DAYS = 252

# zone 경계 — position_pct 이하이면 해당 zone
# [20.0, 40.0, 60.0, 80.0] → zone 1/2/3/4/5 분기
_BOUNDARIES = [20.0, 40.0, 60.0, 80.0]

_ZONE_META: dict[int, dict] = {
    1: {"base_text": "발목 — 강력 매수 구간", "color": "#3182f6"},
    2: {"base_text": "무릎 — 매수 고려 구간", "color": "#54b8ff"},
    3: {"base_text": "허리 — 중립 관망 구간", "color": "#8b95a1"},
    4: {"base_text": "어깨 — 매도 고려 구간", "color": "#ff8c42"},
    5: {"base_text": "머리 — 강력 매도 구간", "color": "#ff4d4d"},
}


# ── 공개 함수 ─────────────────────────────────────────────────────────────

def get_zone(df: pd.DataFrame, rsi_list: list) -> dict:
    """
    5구간 판정 + RSI 보정 후 SilhouetteResponse 형식 dict 반환.

    Parameters
    ----------
    df       : data_collector.get_ohlcv() 반환값의 DataFrame.
               필수 컬럼: high, low, close.
    rsi_list : indicator.compute()["rsi"] — float|None 리스트.
               최신 non-None 값을 현재 RSI로 사용.

    Returns
    -------
    {
        "zone":         int (1~5),
        "signal_text":  str,
        "color":        str (소문자 hex),
        "rsi":          float | None,
        "position_pct": float,   # 소수점 1자리
    }
    """
    # 52주 고가/저가/현재가 산출
    window    = df.tail(_YEARLY_TRADING_DAYS)
    high_52w  = float(window["high"].max())
    low_52w   = float(window["low"].min())
    current   = float(df["close"].iloc[-1])

    position_pct = _calc_position(current, high_52w, low_52w)
    zone         = _classify_zone(position_pct)
    rsi_current  = _latest_rsi(rsi_list)
    signal_text  = _apply_rsi_correction(zone, rsi_current, _ZONE_META[zone]["base_text"])
    color        = _ZONE_META[zone]["color"]

    return {
        "zone":         zone,
        "signal_text":  signal_text,
        "color":        color,
        "rsi":          rsi_current,
        "position_pct": round(position_pct, 1),
    }


# ── 내부 함수 ─────────────────────────────────────────────────────────────

def _calc_position(current: float, high: float, low: float) -> float:
    """52주 고저 대비 현재가 위치 (0~100%)."""
    spread = high - low
    if spread <= 0:
        return 50.0  # 고저 동일(데이터 이상) → 중립 처리
    return float(np.clip((current - low) / spread * 100, 0.0, 100.0))


def _classify_zone(position_pct: float) -> int:
    """position_pct → zone 1~5."""
    for zone, boundary in enumerate(_BOUNDARIES, start=1):
        if position_pct <= boundary:
            return zone
    return 5


def _latest_rsi(rsi_list: list) -> float | None:
    """rsi 리스트에서 가장 마지막 non-None 값 반환."""
    for v in reversed(rsi_list):
        if v is not None:
            return v
    return None


def _apply_rsi_correction(zone: int, rsi: float | None, base_text: str) -> str:
    """
    RSI 보정 (Ch3.2):
    - 저점 구간(1~2) + 과매수(RSI >= 70) → 단기 과열 경고 부기
    - 고점 구간(4~5) + 과매도(RSI <= 30) → 반등 가능성 부기
    """
    if rsi is None:
        return base_text
    if zone in (1, 2) and rsi >= RSI_OVERBOUGHT:
        return base_text + " ※ RSI 과매수 주의"
    if zone in (4, 5) and rsi <= RSI_OVERSOLD:
        return base_text + " ※ RSI 과매도 — 반등 가능"
    return base_text
