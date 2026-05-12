from dotenv import load_dotenv; load_dotenv()
from pykrx import stock
import pandas as pd
from datetime import datetime, timezone

today = datetime.now(timezone.utc).strftime('%Y%m%d')
from_dt = (datetime.now(timezone.utc) - pd.Timedelta(days=365)).strftime('%Y%m%d')
print(f'Fetching OHLCV 005930: {from_dt} -> {today}')

try:
    df = stock.get_market_ohlcv(from_dt, today, '005930')
    print(f'Shape: {df.shape}')
    print('Last 3 rows:')
    print(df.tail(3))
    print('First row date:', df.index[0])
    print('Last row date:', df.index[-1])
    last = df.iloc[-1]
    print(f'Latest close: {last["종가"]:,}')
except Exception as e:
    print(f'ERROR: {type(e).__name__}: {e}')
