"""
data_collector.py — 데이터 수집, 인메모리 캐싱, 4단계 폴백 체계
소유: data_collector (공동)
규칙: 원시 데이터만 반환. MA/RSI/BB 계산은 indicator.py 책임.
예외: get_fear_greed_kr()는 합성 점수 계산까지 포함 (입력값 5개 동일 함수 내 수집).
"""
import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import httpx
import numpy as np
import pandas as pd
import yfinance as yf
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import HTTPException

from constants import (
    API_MODE,
    CACHE_KEY_FEAR_GREED,
    CACHE_KEY_MARKET,
    CNN_FG_HEADERS,
    CNN_FG_URL,
    EXCHANGE_TICKERS,
    KR_FG_MOMENTUM_MAX,
    KR_FG_MOMENTUM_MIN,
    KR_FG_SAFE_ASSET_BOND,
    KR_FG_SAFE_ASSET_DEFAULT,
    KR_FG_SAFE_ASSET_MAX,
    KR_FG_SAFE_ASSET_MIN,
    KR_FG_TREND_MAX,
    KR_FG_TREND_MIN,
    KR_FG_VKOSPI_MAX,
    KR_FG_VKOSPI_MIN,
    KR_FG_WEIGHT_KOSDAQ,
    KR_FG_WEIGHT_MOMENTUM,
    KR_FG_WEIGHT_SAFE_ASSET,
    KR_FG_WEIGHT_STOCK_STRENGTH,
    KR_FG_WEIGHT_TREND,
    KR_FG_WEIGHT_VKOSPI,
    MOCK_DIR,
    ONDEMAND_CACHE_TTL_SEC,
    POLL_INTERVAL_SEC,
    REALIZED_VOL_WINDOW,
    TICKER_KOSDAQ,
    TICKER_KOSPI,
    TICKER_KOSPI200,
    TREND_WINDOW,
)

logger = logging.getLogger(__name__)

# ── 인메모리 캐시 ────────────────────────────────────────────────────────
_cache: dict[str, Any] = {}

# lifespan이 읽는 최종 수집 시각
last_fetched: dict[str, datetime | None] = {
    "market_data": None,
    "fear_greed": None,
}


# ── 유틸 ─────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat(timespec="seconds")


def load_mock(filename: str) -> Any:
    """Mock JSON 로드 — 파일 미존재 시 FileNotFoundError (묵살 금지)."""
    path = os.path.join(MOCK_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _normalize(value: float, min_val: float, max_val: float) -> float:
    if max_val == min_val:
        return 50.0
    return float(np.clip((value - min_val) / (max_val - min_val) * 100, 0.0, 100.0))


def _fg_status(score: float) -> str:
    if score < 20:
        return "extreme_fear"
    elif score < 40:
        return "fear"
    elif score < 60:
        return "neutral"
    elif score < 80:
        return "greed"
    return "extreme_greed"


# ── 4단계 폴백 헬퍼 ───────────────────────────────────────────────────────

def _with_fallback(cache_key: str, fetch_fn, mock_file: str) -> Any:
    """
    0. API_MODE=mock → 즉시 mock 반환
    1. live 수집 시도
    2. 스테일 캐시 반환
    3. mock JSON 폴백
    4. HTTPException(503)
    """
    if API_MODE == "mock":
        data = load_mock(mock_file)
        _cache[cache_key] = {"data": data, "updated_at": _now(), "is_mock": True}
        return data

    try:
        data = fetch_fn()
        _cache[cache_key] = {"data": data, "updated_at": _now(), "is_mock": False}
        return data
    except Exception as e:
        logger.warning(f"[{cache_key}] live fetch failed: {e}")

    if cache_key in _cache:
        logger.info(f"[{cache_key}] serving stale cache")
        return _cache[cache_key]["data"]

    try:
        data = load_mock(mock_file)
        _cache[cache_key] = {"data": data, "updated_at": _now(), "is_mock": True}
        return data
    except FileNotFoundError:
        pass

    raise HTTPException(status_code=503, detail=f"{cache_key} unavailable")


def _ttl_expired(cache_key: str) -> bool:
    if cache_key not in _cache:
        return True
    elapsed = (_now() - _cache[cache_key]["updated_at"]).total_seconds()
    return elapsed > ONDEMAND_CACHE_TTL_SEC


# ── Live 수집 함수 (동기 블로킹 — asyncio.to_thread()로 감싸서 호출) ─────────

def _fetch_exchange_live() -> list[dict]:
    rows = []
    for currency, info in EXCHANGE_TICKERS.items():
        ticker = info["ticker"]
        label  = info["label"]
        try:
            df = yf.Ticker(ticker).history(period="5d", interval="1d")
            if len(df) < 2:
                raise ValueError("insufficient data")
            prev_close  = float(df["Close"].iloc[-2])
            curr_close  = float(df["Close"].iloc[-1])
            change      = round(curr_close - prev_close, 2)
            change_pct  = round(change / prev_close * 100, 2) if prev_close else 0.0
            direction   = "up" if change > 0 else ("down" if change < 0 else "flat")
            rows.append({
                "currency":   currency,
                "label":      label,
                "rate":       round(curr_close, 2),
                "change":     change,
                "change_pct": change_pct,
                "direction":  direction,
                "updated_at": _now_iso(),
            })
        except Exception as e:
            logger.warning(f"exchange {currency} failed: {e}")
    if not rows:
        raise RuntimeError("all exchange fetches failed")
    return rows


def _fetch_indices_live() -> list[dict]:
    # pykrx + yfinance
    from pykrx import stock

    today    = _now().strftime("%Y%m%d")
    from_dt  = (datetime.now(timezone.utc) - pd.Timedelta(days=90)).strftime("%Y%m%d")

    def _krx_index(ticker: str, name: str) -> dict:
        df = stock.get_index_ohlcv(from_dt, today, ticker)
        closes = df["종가"].values
        change_pct = round((closes[-1] - closes[-2]) / closes[-2] * 100, 2) if len(closes) >= 2 else 0.0
        sparkline  = [float(c) for c in closes[-10:]]
        return {"code": name, "current": float(closes[-1]), "change_pct": change_pct, "sparkline": sparkline}

    def _yf_index(ticker: str, name: str) -> dict:
        df = yf.Ticker(ticker).history(period="3mo", interval="1d")
        closes = df["Close"].values
        change_pct = round((closes[-1] - closes[-2]) / closes[-2] * 100, 2) if len(closes) >= 2 else 0.0
        sparkline  = [round(float(c), 2) for c in closes[-10:]]
        return {"code": name, "current": round(float(closes[-1]), 2), "change_pct": change_pct, "sparkline": sparkline}

    return [
        _krx_index(TICKER_KOSPI,  "KOSPI"),
        _krx_index(TICKER_KOSDAQ, "KOSDAQ"),
        _yf_index("^GSPC",  "S&P500"),
        _yf_index("^IXIC",  "NASDAQ"),
    ]


def _fetch_macro_live() -> dict:
    """버핏지수 + M7 베타 (yfinance)."""
    m7_codes = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"]
    m7_names = {"AAPL": "Apple", "MSFT": "Microsoft", "GOOGL": "Alphabet",
                "AMZN": "Amazon", "META": "Meta", "NVDA": "NVIDIA", "TSLA": "Tesla"}
    m7_betas = []
    for code in m7_codes:
        try:
            info = yf.Ticker(code).info
            beta = info.get("beta", None)
            m7_betas.append({"code": code, "name": m7_names[code], "beta": round(float(beta), 2) if beta else None})
        except Exception as e:
            logger.warning(f"beta {code} failed: {e}")

    # 버핏지수 = 시가총액 / GDP  (간이: KOSPI 시가총액 / 한국 GDP 추정)
    # 현재 구현: 고정 근사값 + 향후 FRED 연동으로 대체 가능
    buffett_index = 105.3
    buffett_status = "overvalued"

    return {"buffett_index": buffett_index, "buffett_status": buffett_status, "m7_betas": m7_betas}


def _fetch_fear_greed_kr_live() -> dict:
    """국내 공포탐욕지수 계산 (스파이크 확정 공식)."""
    from pykrx import stock, bond

    today   = _now().strftime("%Y%m%d")
    from_dt = (datetime.now(timezone.utc) - pd.Timedelta(days=120)).strftime("%Y%m%d")

    # 01. KOSPI200 실현변동성 (가중치 0.30) — VKOSPI 대체
    df200   = stock.get_index_ohlcv(from_dt, today, TICKER_KOSPI200)
    closes  = df200["종가"].values.astype(float)
    log_ret = np.diff(np.log(closes + 1e-10))
    realized_vol = np.std(log_ret[-REALIZED_VOL_WINDOW:]) * np.sqrt(252) * 100
    vkospi_raw   = _normalize(realized_vol, KR_FG_VKOSPI_MIN, KR_FG_VKOSPI_MAX)
    vkospi_score = 100.0 - vkospi_raw  # 역방향: 변동성 높을수록 공포

    # 02. KOSPI 등락률 모멘텀 (가중치 0.25)
    df_kospi    = stock.get_index_ohlcv(from_dt, today, TICKER_KOSPI)
    kospi_c     = df_kospi["종가"].values.astype(float)
    kospi_chg   = (kospi_c[-1] - kospi_c[-2]) / kospi_c[-2] * 100 if len(kospi_c) >= 2 else 0.0
    momentum_score = _normalize(kospi_chg, KR_FG_MOMENTUM_MIN, KR_FG_MOMENTUM_MAX)

    # 03. KOSDAQ 등락률 (가중치 0.10)
    df_kq     = stock.get_index_ohlcv(from_dt, today, TICKER_KOSDAQ)
    kq_c      = df_kq["종가"].values.astype(float)
    kq_chg    = (kq_c[-1] - kq_c[-2]) / kq_c[-2] * 100 if len(kq_c) >= 2 else 0.0
    kosdaq_score = _normalize(kq_chg, KR_FG_MOMENTUM_MIN, KR_FG_MOMENTUM_MAX)

    # 04. 주가강도 (가중치 0.15)
    strength_score = (momentum_score + kosdaq_score) / 2

    # 05. KOSPI 추세 (가중치 0.15) — 종가 vs SMA20 괴리율
    sma20        = pd.Series(kospi_c).rolling(TREND_WINDOW).mean().iloc[-1]
    trend_pct    = (kospi_c[-1] - sma20) / sma20 * 100 if sma20 else 0.0
    trend_score  = _normalize(trend_pct, KR_FG_TREND_MIN, KR_FG_TREND_MAX)

    # 06. 안전자산 수요 (가중치 0.05) — 국고채 3년
    try:
        df_bond    = bond.get_otc_treasury_yields(from_dt, today, KR_FG_SAFE_ASSET_BOND)
        bond_yield = float(df_bond["수익률"].iloc[-1])
        safe_asset_score = _normalize(bond_yield, KR_FG_SAFE_ASSET_MIN, KR_FG_SAFE_ASSET_MAX)
    except Exception as e:
        logger.warning(f"bond fetch failed: {e} → using default {KR_FG_SAFE_ASSET_DEFAULT}")
        safe_asset_score = KR_FG_SAFE_ASSET_DEFAULT

    score = (
        vkospi_score   * KR_FG_WEIGHT_VKOSPI
        + momentum_score * KR_FG_WEIGHT_MOMENTUM
        + strength_score * KR_FG_WEIGHT_STOCK_STRENGTH
        + trend_score    * KR_FG_WEIGHT_TREND
        + kosdaq_score   * KR_FG_WEIGHT_KOSDAQ
        + safe_asset_score * KR_FG_WEIGHT_SAFE_ASSET
    )
    score = round(float(np.clip(score, 0, 100)), 1)

    return {
        "score": score,
        "status": _fg_status(score),
        "market": "KR",
        "components": {
            "vkospi":         round(vkospi_score, 1),
            "momentum":       round(momentum_score, 1),
            "stock_strength": round(strength_score, 1),
            "trend":          round(trend_score, 1),
            "kosdaq":         round(kosdaq_score, 1),
            "safe_asset":     round(safe_asset_score, 1),
        },
        "updated_at": _now_iso(),
    }


def _fetch_fear_greed_us_live() -> dict:
    """CNN Fear & Greed Index 직접 수집 (User-Agent Chrome 필수)."""
    resp = httpx.get(CNN_FG_URL, headers=CNN_FG_HEADERS, timeout=10.0)
    resp.raise_for_status()
    data  = resp.json()
    score = float(data["fear_and_greed"]["score"])
    rating = data["fear_and_greed"]["rating"].lower().replace(" ", "_")
    return {
        "score":      round(score, 1),
        "status":     rating,
        "market":     "US",
        "updated_at": _now_iso(),
    }


def _fetch_stock_list_live() -> list[dict]:
    """KOSPI 대형주 + M7 종목 리스트 (현재가, 등락률, 거래금액, zone)."""
    from pykrx import stock

    today       = _now().strftime("%Y%m%d")
    trading_day = stock.get_nearest_business_day_in_a_week(today, prev=True)
    kr_codes = ["005930", "000660", "035420", "005380", "051910"]
    kr_names = {"005930": "삼성전자", "000660": "SK하이닉스", "035420": "NAVER",
                "005380": "현대차", "051910": "LG화학"}
    m7_codes = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"]
    m7_names = {"AAPL": "Apple", "MSFT": "Microsoft", "GOOGL": "Alphabet",
                "AMZN": "Amazon", "META": "Meta", "NVDA": "NVIDIA", "TSLA": "Tesla"}

    rows = []

    # KR
    try:
        df_ohlcv = stock.get_market_ohlcv(trading_day, market="KOSPI")
        for code in kr_codes:
            if code in df_ohlcv.index:
                row = df_ohlcv.loc[code]
                rows.append({
                    "code": code, "name": kr_names[code], "market": "KR",
                    "price": int(row.get("종가", 0)),
                    "change_pct": round(float(row.get("등락률", 0)), 2),
                    "volume": int(row.get("거래대금", 0)) // 10000,
                    "zone": 3,  # silhouette.py가 정밀 계산 — 여기서는 중립값
                })
        logger.info(f"stock_list KR live ok: {trading_day}")
    except Exception as e:
        logger.warning(f"KR stock list fetch failed: {type(e).__name__}: {e}")

    # US (M7)
    for code in m7_codes:
        try:
            df = yf.Ticker(code).history(period="2d", interval="1d")
            if len(df) >= 2:
                prev = float(df["Close"].iloc[-2])
                curr = float(df["Close"].iloc[-1])
                chg  = round((curr - prev) / prev * 100, 2) if prev else 0.0
                rows.append({
                    "code": code, "name": m7_names[code], "market": "US",
                    "price": round(curr, 2),
                    "change_pct": chg,
                    "volume": int(df["Volume"].iloc[-1]),
                    "zone": 3,
                })
        except Exception as e:
            logger.warning(f"M7 {code} fetch failed: {e}")

    return rows


def _fetch_ohlcv_live(code: str, period: str) -> list[dict]:
    """종목 OHLCV — KR(pykrx) / US(yfinance) 분기."""
    from pykrx import stock

    # 숫자 코드 → KRX
    if code.isdigit():
        today   = _now().strftime("%Y%m%d")
        days    = {"1y": 365, "6m": 180, "3m": 90, "1m": 30}.get(period, 365)
        from_dt = (datetime.now(timezone.utc) - pd.Timedelta(days=days)).strftime("%Y%m%d")
        df = stock.get_market_ohlcv(from_dt, today, code)
        rows = []
        for dt_idx, row in df.iterrows():
            rows.append({
                "date":   str(dt_idx)[:10],
                "open":   int(row["시가"]),
                "high":   int(row["고가"]),
                "low":    int(row["저가"]),
                "close":  int(row["종가"]),
                "volume": int(row["거래량"]),
            })
        return rows
    else:
        # US ticker
        df = yf.Ticker(code).history(period=period, interval="1d")
        rows = []
        for dt_idx, row in df.iterrows():
            rows.append({
                "date":   str(dt_idx)[:10],
                "open":   round(float(row["Open"]),  2),
                "high":   round(float(row["High"]),  2),
                "low":    round(float(row["Low"]),   2),
                "close":  round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })
        return rows


def _fetch_supply_live(code: str) -> list[dict]:
    """개인/외국인/기관 수급 (pykrx, 만원 단위)."""
    if not code.isdigit():
        return []  # US 종목은 빈 리스트 즉시 반환

    from pykrx import stock

    today   = _now().strftime("%Y%m%d")
    from_dt = (datetime.now(timezone.utc) - pd.Timedelta(days=45)).strftime("%Y%m%d")
    # get_market_trading_value_by_date: 날짜 인덱스, 컬럼 = 개인/외국인합계/기관합계 (flat, on="순매수")
    df = stock.get_market_trading_value_by_date(from_dt, today, code)

    if df.empty:
        return []

    rows = []
    for dt_idx, row in df.iterrows():
        try:
            individual  = int(row.get("개인",      0) // 10000)
            foreign     = int(row.get("외국인합계", 0) // 10000)
            institution = int(row.get("기관합계",   0) // 10000)
        except Exception:
            continue
        rows.append({
            "date":        str(dt_idx)[:10],
            "individual":  individual,
            "foreign":     foreign,
            "institution": institution,
        })
    return rows[-30:]  # 최근 30일


def _fetch_valuation_live(code: str) -> dict:
    """PER/PBR/ROE/EPS + sector_per + signals."""
    if code.isdigit():
        from pykrx import stock

        today   = _now().strftime("%Y%m%d")
        from_dt = (datetime.now(timezone.utc) - pd.Timedelta(days=5)).strftime("%Y%m%d")
        df = stock.get_market_fundamental_by_date(from_dt, today, code)
        if df.empty:
            raise RuntimeError(f"pykrx fundamental empty for {code}")
        latest = df.iloc[-1]
        per = float(latest["PER"]) if latest["PER"] != 0 else None
        pbr = float(latest["PBR"]) if latest["PBR"] != 0 else None
        eps = float(latest["EPS"]) if latest["EPS"] != 0 else None

        # ROE: pykrx 미제공 → yfinance로 보완
        try:
            roe_raw = yf.Ticker(code + ".KS").info.get("returnOnEquity")
            roe = round(float(roe_raw) * 100, 2) if roe_raw else None
        except Exception:
            roe = None

    else:
        info = yf.Ticker(code).info
        per = info.get("trailingPE")
        pbr = info.get("priceToBook")
        roe_raw = info.get("returnOnEquity")
        roe = round(float(roe_raw) * 100, 2) if roe_raw else None
        eps = info.get("trailingEps")

    sector_per = None  # 업종 PER: 별도 수집 필요 — 현재 None

    def _per_signal(p):
        if p is None: return "정보없음"
        if p < 10:    return "저평가"
        if p < 20:    return "적정"
        return "고평가"

    def _pbr_signal(p):
        if p is None: return "정보없음"
        if p < 1.0:   return "저평가"
        if p < 2.0:   return "적정"
        return "고평가"

    def _roe_signal(r):
        if r is None: return "정보없음"
        if r < 5:     return "낮음"
        if r < 15:    return "보통"
        return "높음"

    return {
        "per": per, "pbr": pbr, "roe": roe, "eps": eps,
        "eps_yoy": None,
        "sector_per": sector_per,
        "signals": {"per": _per_signal(per), "pbr": _pbr_signal(pbr), "roe": _roe_signal(roe)},
    }


# ── 스케줄러 Job (async def — APScheduler가 이벤트 루프에서 await) ──────────

async def _refresh_market() -> None:
    logger.info("_refresh_market start")
    try:
        rates   = await asyncio.to_thread(_fetch_exchange_live)
        indices = await asyncio.to_thread(_fetch_indices_live)
        macro   = await asyncio.to_thread(_fetch_macro_live)
        _cache["exchange"] = {"data": rates,   "updated_at": _now(), "is_mock": False}
        _cache["indices"]  = {"data": indices, "updated_at": _now(), "is_mock": False}
        _cache["macro"]    = {"data": macro,   "updated_at": _now(), "is_mock": False}
        last_fetched["market_data"] = _now()
    except Exception as e:
        logger.error(f"_refresh_market failed: {e}")


async def _refresh_fear_greed() -> None:
    logger.info("_refresh_fear_greed start")
    try:
        kr = await asyncio.to_thread(_fetch_fear_greed_kr_live)
        _cache["fear_greed_kr"] = {"data": kr, "updated_at": _now(), "is_mock": False}
        last_fetched["fear_greed"] = _now()
    except Exception as e:
        logger.error(f"_refresh_fear_greed_kr failed: {e}")
    try:
        us = await asyncio.to_thread(_fetch_fear_greed_us_live)
        _cache["fear_greed_us"] = {"data": us, "updated_at": _now(), "is_mock": False}
    except Exception as e:
        logger.error(f"_refresh_fear_greed_us failed: {e}")


async def _refresh_stock_list() -> None:
    logger.info("_refresh_stock_list start")
    try:
        lst = await asyncio.to_thread(_fetch_stock_list_live)
        _cache["stock_list"] = {"data": lst, "updated_at": _now(), "is_mock": False}
    except Exception as e:
        logger.error(f"_refresh_stock_list failed: {e}")


# ── 진입점 ───────────────────────────────────────────────────────────────

async def startup_fetch() -> None:
    """lifespan 에서 await — 실패해도 앱 부팅 계속."""
    logger.info("startup_fetch begin")

    async def _safe(coro):
        try:
            await coro
        except Exception as e:
            logger.warning(f"startup task failed (non-fatal): {e}")

    if API_MODE == "mock":
        _load_all_mocks()
        return

    await _safe(_refresh_market())
    await _safe(_refresh_fear_greed())
    await _safe(_refresh_stock_list())
    logger.info("startup_fetch done")


def _load_all_mocks() -> None:
    """API_MODE=mock 시 모든 캐시를 mock 파일로 초기화."""
    pairs = [
        ("exchange",      "exchange_mock.json"),
        ("fear_greed_kr", "fear_greed_kr_mock.json"),
        ("fear_greed_us", "us_fear_greed.json"),
        ("indices",       "indices_mock.json"),
        ("macro",         "macro_mock.json"),
        ("stock_list",    "stock_list_mock.json"),
    ]
    for key, fname in pairs:
        try:
            data = load_mock(fname)
            _cache[key] = {"data": data, "updated_at": _now(), "is_mock": True}
        except FileNotFoundError:
            logger.warning(f"mock file not found: {fname}")


def register_scheduler_jobs(scheduler: AsyncIOScheduler) -> None:
    scheduler.add_job(_refresh_market,    "interval", seconds=POLL_INTERVAL_SEC, id="market")
    scheduler.add_job(_refresh_fear_greed,"interval", seconds=POLL_INTERVAL_SEC * 4, id="fear_greed")
    scheduler.add_job(_refresh_stock_list,"interval", seconds=POLL_INTERVAL_SEC, id="stock_list")


# ── 공개 함수 (routers에서 호출) ─────────────────────────────────────────

def get_exchange_rates() -> list[dict]:
    return _with_fallback("exchange", _fetch_exchange_live, "exchange_mock.json")


def get_fear_greed_kr() -> dict:
    return _with_fallback("fear_greed_kr", _fetch_fear_greed_kr_live, "fear_greed_kr_mock.json")


def get_fear_greed_us() -> dict:
    return _with_fallback("fear_greed_us", _fetch_fear_greed_us_live, "us_fear_greed.json")


def get_indices() -> list[dict]:
    return _with_fallback("indices", _fetch_indices_live, "indices_mock.json")


def get_macro() -> dict:
    return _with_fallback("macro", _fetch_macro_live, "macro_mock.json")


def get_stock_list() -> list[dict]:
    return _with_fallback("stock_list", _fetch_stock_list_live, "stock_list_mock.json")


def get_ohlcv(code: str, period: str = "1y") -> list[dict]:
    cache_key  = f"ohlcv_{code}_{period}"
    mock_file  = f"krx_{code}.json" if code.isdigit() else f"m7_{code}.json"

    if not _ttl_expired(cache_key):
        return _cache[cache_key]["data"]

    return _with_fallback(cache_key, lambda: _fetch_ohlcv_live(code, period), mock_file)


def get_supply(code: str) -> list[dict]:
    if not code.isdigit():
        return []  # US 종목 — 즉시 빈 리스트

    cache_key = f"supply_{code}"
    mock_file = f"supply_{code}.json"

    if not _ttl_expired(cache_key):
        return _cache[cache_key]["data"]

    return _with_fallback(cache_key, lambda: _fetch_supply_live(code), mock_file)


def get_valuation(code: str) -> dict:
    cache_key = f"valuation_{code}"
    mock_file = f"valuation_{code}.json"

    if not _ttl_expired(cache_key):
        return _cache[cache_key]["data"]

    return _with_fallback(cache_key, lambda: _fetch_valuation_live(code), mock_file)
