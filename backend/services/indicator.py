"""
indicator.py — 기술적 지표 계산 (이승재 담당)
입력: data_collector.get_ohlcv() 반환값을 DataFrame으로 변환한 것
출력: MA / RSI / 볼린저밴드 계산값 (리스트), 베타 (단일 float)

라우터 오케스트레이션 패턴 (stock.py):
    ohlcv_df   = pd.DataFrame(data_collector.get_ohlcv(code, period))
    indicators = indicator.compute(ohlcv_df)
    rsi_latest = indicators["rsi"][-1]   # silhouette.py 입력
"""
import logging

import numpy as np
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

_RSI_PERIOD = 14
_BB_PERIOD  = 20
_BB_SIGMA   = 2.0


# ── 공개 함수 ─────────────────────────────────────────────────────────────

def compute(df: pd.DataFrame) -> dict[str, list]:
    """
    MA(5/20/60/120일 SMA), RSI(14일), 볼린저밴드(20일/2σ) 일괄 계산.

    Parameters
    ----------
    df : pd.DataFrame
        data_collector.get_ohlcv() 반환값을 pd.DataFrame()으로 변환한 것.
        필수 컬럼: close (open/high/low/volume은 이 함수에서 미사용).

    Returns
    -------
    dict with keys: ma5, ma20, ma60, ma120, bb_upper, bb_lower, rsi
        각 값은 list[float | None], 길이 = len(df).
        데이터 부족 구간(초기 window)은 None.
        rsi[-1] 이 현재 RSI 값 — silhouette.get_zone() 에 전달.
    """
    closes = df["close"].astype(float).reset_index(drop=True)

    # ── MA (SMA) ──────────────────────────────────────────────────────────
    ma5   = _sma(closes, 5)
    ma20  = _sma(closes, 20)
    ma60  = _sma(closes, 60)
    ma120 = _sma(closes, 120)

    # ── 볼린저밴드 (SMA20 ± 2σ, 모집단 표준편차 ddof=0 — TradingView/HTS 동일)
    mid = closes.rolling(_BB_PERIOD).mean()
    std = closes.rolling(_BB_PERIOD).std(ddof=0)
    bb_upper = [_fmt(m + _BB_SIGMA * s) for m, s in zip(mid, std)]
    bb_lower = [_fmt(m - _BB_SIGMA * s) for m, s in zip(mid, std)]

    # ── RSI 14일 (True Wilder's RMA — TradingView/HTS 동일 방식) ────────────
    rsi = _wilder_rsi(closes, _RSI_PERIOD)

    return {
        "ma5":      ma5,
        "ma20":     ma20,
        "ma60":     ma60,
        "ma120":    ma120,
        "bb_upper": bb_upper,
        "bb_lower": bb_lower,
        "rsi":      rsi,
    }


def compute_beta(code: str, daily_closes: list[float]) -> float | None:
    """
    52주 베타 계산 (주간 수익률 기준, vs 벤치마크).

    KR 종목(숫자 코드) → KOSPI(^KS11)
    US 종목(문자 코드) → S&P500(^GSPC)

    Parameters
    ----------
    code         : 종목 코드 ("005930" → KR, "AAPL" → US)
    daily_closes : 일간 종가 리스트 (최소 10개 이상 권장, 1년치 약 250개)

    Returns
    -------
    float | None  — 계산 실패 시 None
    """
    if len(daily_closes) < 10:
        return None
    try:
        # 종목 일간 → 5거래일 단위 주간화 (인덱스 0, 5, 10, ...)
        stock_c  = np.array(daily_closes, dtype=float)
        weekly_s = stock_c[::5]
        if len(weekly_s) < 10:
            return None
        s_ret = np.diff(weekly_s) / weekly_s[:-1]

        # 벤치마크 주간 데이터 (yfinance 직접 수집)
        benchmark = "^KS11" if code.isdigit() else "^GSPC"
        df_bench  = yf.Ticker(benchmark).history(period="1y", interval="1wk")
        bench_c   = df_bench["Close"].values.astype(float)
        if len(bench_c) < 10:
            return None
        b_ret = np.diff(bench_c) / bench_c[:-1]

        # 길이 통일 (짧은 쪽 기준, 최신 데이터 우선)
        n         = min(len(s_ret), len(b_ret))
        s_ret     = s_ret[-n:]
        b_ret     = b_ret[-n:]

        cov_mat = np.cov(s_ret, b_ret)
        beta    = cov_mat[0, 1] / cov_mat[1, 1]
        return round(float(beta), 2)
    except Exception as e:
        logger.warning(f"beta calc failed for {code}: {e}")
        return None


# ── 내부 유틸 ─────────────────────────────────────────────────────────────

def _sma(series: pd.Series, period: int) -> list:
    raw = series.rolling(period).mean()
    return [_fmt(v) for v in raw]


def _wilder_rsi(closes: pd.Series, period: int) -> list:
    """True Wilder's RSI — TradingView / 국내 HTS와 동일한 RMA 방식.

    시드: 첫 period개 상승/하락의 단순평균(SMA)
    이후: avg = (prev * (period-1) + current) / period
    """
    delta = closes.diff()
    gain  = delta.clip(lower=0.0).values
    loss  = (-delta).clip(lower=0.0).values
    n     = period
    size  = len(closes)
    result: list[float | None] = [None] * size

    if size <= n:
        return result

    # 시드: index 1..n 의 단순평균 (index 0은 diff=NaN)
    avg_gain = float(np.mean(gain[1:n + 1]))
    avg_loss = float(np.mean(loss[1:n + 1]))

    if avg_loss == 0:
        result[n] = 100.0
    else:
        result[n] = round(100.0 - 100.0 / (1.0 + avg_gain / avg_loss), 2)

    for i in range(n + 1, size):
        avg_gain = (avg_gain * (n - 1) + gain[i]) / n
        avg_loss = (avg_loss * (n - 1) + loss[i]) / n
        if avg_loss == 0:
            result[i] = 100.0
        else:
            result[i] = round(100.0 - 100.0 / (1.0 + avg_gain / avg_loss), 2)

    return result


def _fmt(value) -> float | None:
    """NaN/Inf → None, 유효값 → 소수점 2자리 float."""
    try:
        v = float(value)
        return round(v, 2) if np.isfinite(v) else None
    except (TypeError, ValueError):
        return None
