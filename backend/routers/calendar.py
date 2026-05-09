"""calendar.py — 박성원 담당 라우터
prefix: /api/calendar (main.py에서 부여)
데이터 소스: data/mock/calendar_2026.json (하드코딩)
d_day: 요청 시점에서 실시간 계산 → 심사 기간(5/14~5/28) 중 카운트다운 정확
"""
from datetime import date

from fastapi import APIRouter, Query

from services.data_collector import load_mock

router = APIRouter()


@router.get("")
def calendar(
    year: int = Query(default=2026, ge=2026, le=2030),
    month: int = Query(default=5, ge=1, le=12),
):
    """월별 투자 이벤트 목록 — d_day는 요청 시점 기준으로 계산."""
    raw = load_mock("calendar_2026.json")
    today = date.today()

    events = []
    for e in raw["events"]:
        event_date = date.fromisoformat(e["date"])
        if event_date.year != year or event_date.month != month:
            continue
        d_day = (event_date - today).days
        events.append({**e, "d_day": d_day})

    return {"events": events}
