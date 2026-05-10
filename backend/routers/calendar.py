"""calendar.py — 박성원 담당 라우터
prefix: /api/calendar (main.py에서 부여)

데이터 우선순위:
  1. 메모리 캐시 (6시간 TTL)
  2. calendar_service (실시간 수집)
  3. mock JSON 폴백
"""
import logging
from datetime import date, datetime, timezone

from fastapi import APIRouter, Query

from services import calendar_service
from services.data_collector import load_mock

logger = logging.getLogger(__name__)
router = APIRouter()

# {year: {"data": [...], "updated_at": datetime}}
_cache: dict = {}
_CACHE_TTL = 3600 * 6  # 6시간


@router.get("")
def calendar(
    year: int = Query(default=2026, ge=2020, le=2030),
    month: int = Query(default=5, ge=1, le=12),
):
    """월별 투자 이벤트 — d_day는 요청 시점 기준 실시간 계산."""
    all_events = _get_year_events(year)
    today = date.today()

    events = []
    for e in all_events:
        try:
            event_date = date.fromisoformat(e["date"])
        except (ValueError, KeyError):
            continue
        if event_date.year != year or event_date.month != month:
            continue
        events.append({**e, "d_day": (event_date - today).days})

    return {"events": events}


def _get_year_events(year: int) -> list:
    now = datetime.now(timezone.utc)

    # 캐시 HIT
    if year in _cache:
        elapsed = (now - _cache[year]["updated_at"]).total_seconds()
        if elapsed < _CACHE_TTL:
            return _cache[year]["data"]

    # 실시간 수집
    try:
        events = calendar_service.get_all_events(year)
        if events:
            _cache[year] = {"data": events, "updated_at": now}
            logger.info(f"Calendar live: {len(events)}개 ({year})")
            return events
    except Exception as e:
        logger.warning(f"calendar_service failed ({year}): {e}")

    # mock 폴백
    try:
        raw = load_mock("calendar_2026.json")
        events = [e for e in raw.get("events", []) if e["date"].startswith(str(year))]
        _cache[year] = {"data": events, "updated_at": now}
        logger.info(f"Calendar mock fallback: {len(events)}개 ({year})")
        return events
    except Exception:
        return []
