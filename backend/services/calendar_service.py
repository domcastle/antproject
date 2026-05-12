"""
calendar_service.py — 실시간 투자 이벤트 수집

소스별 수집 전략:
  - 위칭데이  : 계산 (3/6/9/12월 세 번째 금요일)
  - FOMC     : federalreserve.gov 스크래핑
  - CPI      : bls.gov 스크래핑
  - 실적     : yfinance M7 종목 calendar
  - 각 소스 실패 시 빈 리스트 반환 (라우터에서 mock 폴백)
"""
import calendar as _cal
import logging
import re
from datetime import date
from typing import List, Dict

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    )
}

_BADGE = {
    "rate":     "#fef3c7",
    "cpi":      "#fef9c3",
    "witching": "#fee2e2",
    "earnings": "#dbeafe",
}

_M7 = [
    ("AAPL",  "애플 실적 발표"),
    ("MSFT",  "마이크로소프트 실적 발표"),
    ("GOOGL", "알파벳(구글) 실적 발표"),
    ("AMZN",  "아마존 실적 발표"),
    ("NVDA",  "엔비디아 실적 발표"),
    ("META",  "메타 실적 발표"),
    ("TSLA",  "테슬라 실적 발표"),
]

_MONTH = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


# ── 위칭데이 (계산) ───────────────────────────────────────────────────────────

def get_witching_days(year: int) -> List[Dict]:
    """쿼드러플 위칭데이: 3·6·9·12월의 세 번째 금요일"""
    events = []
    for month in [3, 6, 9, 12]:
        weeks = _cal.monthcalendar(year, month)
        fridays = [w[4] for w in weeks if w[4] != 0]
        d = date(year, month, fridays[2])
        events.append({
            "date": d.isoformat(),
            "type": "witching",
            "title": "쿼드러플 위칭데이",
            "badge_color": _BADGE["witching"],
        })
    return events


# ── FOMC (federalreserve.gov) ────────────────────────────────────────────────

def get_fomc_dates(year: int) -> List[Dict]:
    """FOMC 금리 결정일 — federalreserve.gov 스크래핑
    해당 연도 섹션만 추출해 다른 연도 날짜 혼입 방지.
    """
    try:
        url = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
        r = requests.get(url, timeout=12, headers=_HEADERS)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        text = soup.get_text(" ", strip=True)

        # ── 해당 연도 섹션만 잘라내기 ──────────────────────────────────────
        # 페이지: "2026 FOMC Meetings ... 2025 FOMC Meetings ..."
        start_marker = f"{year} FOMC Meetings"
        next_year    = str(year - 1)
        next_marker  = f"{next_year} FOMC Meetings"

        start_idx = text.find(start_marker)
        if start_idx == -1:
            logger.warning(f"FOMC: {year} 섹션 없음")
            return []

        end_idx = text.find(next_marker, start_idx)
        section = text[start_idx: end_idx if end_idx != -1 else start_idx + 4000]

        # ── "Released Month day, year" 의사록 공개일 제거 ────────────────────
        section = re.sub(
            r'\(Released\s+\w+\s+\d{1,2},?\s*\d{4}\)',
            '', section, flags=re.IGNORECASE,
        )

        # ── 날짜 파싱: "Month day1-day2" 형식만 허용 (2-day 회의 한정) ────
        # 단독 날짜("Month day")는 특수 회의(notation vote 등)라 제외
        events = []
        seen: set = set()
        for m in re.finditer(
            r'(\b(?:January|February|March|April|May|June|July|August|'
            r'September|October|November|December)\b)'
            r'\s+(\d{1,2})\s*[-–]\s*(\d{1,2})',   # 반드시 day1-day2 형식
            section,
            re.IGNORECASE,
        ):
            month_name = m.group(1).lower()
            day = int(m.group(3))   # 마지막 날 = 결정일
            month_num = _MONTH.get(month_name)
            if not month_num or month_num in seen:
                continue
            try:
                d = date(year, month_num, day)
            except ValueError:
                continue
            seen.add(month_num)
            events.append({
                "date": d.isoformat(),
                "type": "rate",
                "title": "FOMC 금리 결정",
                "badge_color": _BADGE["rate"],
            })

        events.sort(key=lambda e: e["date"])
        logger.info(f"FOMC: {len(events)}개 수집 ({year})")
        return events

    except Exception as e:
        logger.warning(f"FOMC fetch failed: {e}")
        return []


# ── CPI (bls.gov) ────────────────────────────────────────────────────────────

def get_cpi_dates(year: int) -> List[Dict]:
    """미국 CPI 발표일 — bls.gov 스크래핑 (실패 시 근사 계산 폴백)"""
    events = _fetch_cpi_bls(year)
    if events:
        return events
    return _calc_cpi_approx(year)


def _fetch_cpi_bls(year: int) -> List[Dict]:
    """BLS 웹사이트에서 CPI 발표 일정 스크래핑"""
    try:
        session = requests.Session()
        # BLS는 브라우저 세션처럼 먼저 메인 페이지를 방문해야 403 우회 가능
        session.get("https://www.bls.gov/", timeout=8, headers=_HEADERS)
        r = session.get(
            "https://www.bls.gov/schedule/news_release/cpi.htm",
            timeout=12,
            headers={
                **_HEADERS,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": "https://www.bls.gov/",
            },
        )
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        events = []
        seen: set = set()
        for table in soup.find_all("table"):
            for row in table.find_all("tr"):
                for cell in row.find_all(["td", "th"]):
                    text = cell.get_text(strip=True)
                    m = re.search(
                        r'(\b(?:January|February|March|April|May|June|July|August|'
                        r'September|October|November|December)\b)'
                        r'\s+(\d{1,2}),?\s*(\d{4})',
                        text, re.IGNORECASE,
                    )
                    if not m:
                        continue
                    month_name, day, yr = m.group(1).lower(), int(m.group(2)), int(m.group(3))
                    if yr != year or month_name not in _MONTH:
                        continue
                    key = f"{yr}-{_MONTH[month_name]:02d}"
                    if key in seen:
                        continue
                    try:
                        d = date(year, _MONTH[month_name], day)
                    except ValueError:
                        continue
                    seen.add(key)
                    events.append({"date": d.isoformat(), "type": "cpi",
                                   "title": "미국 CPI 발표", "badge_color": _BADGE["cpi"]})

        events.sort(key=lambda e: e["date"])
        logger.info(f"CPI BLS: {len(events)}개 수집 ({year})")
        return events
    except Exception as e:
        logger.warning(f"CPI BLS fetch failed: {e}")
        return []


def _calc_cpi_approx(year: int) -> List[Dict]:
    """BLS 실패 시 근사 계산 — 매월 두 번째 수요일 (역사적 평균)"""
    events = []
    for month in range(1, 13):
        weeks = _cal.monthcalendar(year, month)
        wednesdays = [w[2] for w in weeks if w[2] != 0]
        if len(wednesdays) < 2:
            continue
        d = date(year, month, wednesdays[1])  # 두 번째 수요일
        events.append({"date": d.isoformat(), "type": "cpi",
                       "title": "미국 CPI 발표 (추정)", "badge_color": _BADGE["cpi"]})
    logger.info(f"CPI 근사값 {len(events)}개 사용 ({year})")
    return events


# ── 실적 발표 (yfinance M7) ──────────────────────────────────────────────────

def get_earnings_dates(year: int) -> List[Dict]:
    """M7 실적 발표일 — yfinance calendar"""
    import yfinance as yf

    events = []
    for ticker, title in _M7:
        try:
            cal = yf.Ticker(ticker).calendar
            if cal is None:
                continue

            # yfinance 버전에 따라 dict 또는 DataFrame 반환
            if hasattr(cal, "to_dict"):          # DataFrame
                dates = cal.get("Earnings Date", {})
                dates = list(dates.values()) if isinstance(dates, dict) else []
            elif isinstance(cal, dict):          # dict
                raw = cal.get("Earnings Date") or cal.get("earnings_date", [])
                dates = raw if isinstance(raw, (list, tuple)) else [raw]
            else:
                continue

            for d in dates:
                if d is None:
                    continue
                try:
                    dt = d.date() if hasattr(d, "date") else d
                    if dt.year == year:
                        events.append({
                            "date": dt.isoformat(),
                            "type": "earnings",
                            "title": title,
                            "badge_color": _BADGE["earnings"],
                        })
                except Exception:
                    continue

        except Exception as e:
            logger.warning(f"Earnings fetch failed [{ticker}]: {e}")

    events.sort(key=lambda e: e["date"])
    logger.info(f"Earnings: {len(events)}개 수집 ({year})")
    return events


# ── 전체 수집 ────────────────────────────────────────────────────────────────

def get_all_events(year: int) -> List[Dict]:
    """모든 소스를 수집해 날짜순 정렬 반환."""
    events: List[Dict] = []
    events.extend(get_witching_days(year))   # 계산 — 항상 성공
    events.extend(get_fomc_dates(year))
    events.extend(get_cpi_dates(year))
    events.extend(get_earnings_dates(year))
    events.sort(key=lambda e: e["date"])
    return events
