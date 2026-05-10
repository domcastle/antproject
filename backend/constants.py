import os
from dotenv import load_dotenv
load_dotenv()

# Scheduler intervals
POLL_INTERVAL_SEC: int = 900
INSIGHT_CACHE_SEC: int = 3600

# Runtime config
API_MODE: str = os.getenv("API_MODE", "mock")
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
MOCK_DIR: str = "data/mock/"

# Credentials
KRX_ID: str = os.getenv("KRX_ID", "")
KRX_PW: str = os.getenv("KRX_PW", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = "gemini-2.5-flash"

# Technical indicators
RSI_OVERBOUGHT: int = 70
RSI_OVERSOLD: int = 30
SILHOUETTE_ZONES: int = 5
REALIZED_VOL_WINDOW: int = 20
MOMENTUM_WINDOW: int = 20
TREND_WINDOW: int = 20  # rolling(20) SMA 기반 추세 괴리율

# Buffett indicator
BUFFETT_UNDERVALUED: int = 70
BUFFETT_OVERVALUED: int = 100
BUFFETT_BUBBLE: int = 150

# Beta thresholds
BETA_HIGH: float = 1.5
BETA_LOW: float = 0.8

# KR Fear & Greed weights (sum = 1.00)
KR_FG_WEIGHT_VKOSPI: float = 0.30
KR_FG_WEIGHT_MOMENTUM: float = 0.25
KR_FG_WEIGHT_STOCK_STRENGTH: float = 0.15
KR_FG_WEIGHT_TREND: float = 0.15
KR_FG_WEIGHT_KOSDAQ: float = 0.10
KR_FG_WEIGHT_SAFE_ASSET: float = 0.05

# KR Fear & Greed normalization ranges (스파이크 확정)
KR_FG_VKOSPI_MIN: float = 10.0
KR_FG_VKOSPI_MAX: float = 80.0
KR_FG_MOMENTUM_MIN: float = -5.0
KR_FG_MOMENTUM_MAX: float = 5.0
KR_FG_TREND_MIN: float = -10.0
KR_FG_TREND_MAX: float = 10.0
KR_FG_SAFE_ASSET_MIN: float = 1.0
KR_FG_SAFE_ASSET_MAX: float = 5.0
KR_FG_SAFE_ASSET_DEFAULT: float = 50.0
KR_FG_SAFE_ASSET_BOND: str = "국고채 3년"

# CNN Fear & Greed (스파이크 확정: Chrome/131 + Referer 필수)
CNN_FG_URL: str = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
CNN_FG_HEADERS: dict[str, str] = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Referer": "https://edition.cnn.com/",
}

# Index tickers (pykrx 스파이크 확정)
TICKER_KOSPI: str = "1001"
TICKER_KOSDAQ: str = "2001"
TICKER_KOSPI200: str = "1028"

# Exchange rate tickers — nested dict: ticker(yfinance) + label(UI)
EXCHANGE_TICKERS: dict[str, dict[str, str]] = {
    "USD": {"ticker": "USDKRW=X", "label": "달러"},
    "EUR": {"ticker": "EURKRW=X", "label": "유로"},
    "JPY": {"ticker": "JPYKRW=X", "label": "엔"},
    "CNY": {"ticker": "CNYKRW=X", "label": "위안"},
    "GBP": {"ticker": "GBPKRW=X", "label": "파운드"},
}

# Cache keys (오타 방지)
CACHE_KEY_MARKET: str = "market"
CACHE_KEY_FEAR_GREED: str = "fear_greed"

# On-demand cache TTL
ONDEMAND_CACHE_TTL_SEC: int = 1800  # 30분
