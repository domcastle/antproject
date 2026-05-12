"""
gemini.py — Gemini AI 투자 방향성 인사이트 (이승재 담당)
Skills.md Ch5.2 기반

1시간 모듈 레벨 캐시:
    _insight_cache: dict[code → {data, updated_at}]

폴백 우선순위:
    0. API_MODE=mock 또는 GEMINI_API_KEY 미설정 → mock JSON
    1. Gemini 호출 성공 → 캐시 저장 후 반환
    2. Gemini 호출 실패 → mock JSON 폴백
    3. mock 파일 없음 → 기본 안내 메시지

외부 호출 (insight.py 라우터):
    result = gemini.get_insight(code, stock_data)
"""
import json
import logging
import os
from datetime import datetime, timezone

from constants import API_MODE, GEMINI_API_KEY, GEMINI_MODEL, INSIGHT_CACHE_SEC, MOCK_DIR

logger = logging.getLogger(__name__)

_DISCLAIMER = "본 내용은 AI가 생성한 참고 정보이며 투자 권유가 아닙니다. 투자 결정은 본인 책임입니다."

# 모듈 레벨 인사이트 캐시 — {code: {"data": dict, "updated_at": datetime}}
_insight_cache: dict[str, dict] = {}


# ── 공개 함수 ─────────────────────────────────────────────────────────────

def get_insight(code: str, stock_data: dict) -> dict:
    """
    Gemini 2.5 Flash로 AI 투자 방향성 인사이트 생성.

    Parameters
    ----------
    code       : 종목 코드 ("005930", "AAPL" 등)
    stock_data : insight.py 라우터가 조립한 종목 컨텍스트 dict
        {
            code, name, price, change_pct,
            rsi, zone, signal_text, position_pct,
            per, pbr, roe, eps,
            supply_recent: {individual, foreign, institution}  # 최근 5일 합산
        }

    Returns
    -------
    {
        "summary":    str,   # 20자 이내 한 줄 요약
        "reason":     str,   # "1. ...\n2. ...\n3. ..." 3줄 근거
        "disclaimer": str,   # 고정 면책 문구
        "cached":     bool,
    }
    """
    # 0단계: mock 모드 또는 API 키 미설정
    if API_MODE == "mock" or not GEMINI_API_KEY:
        return _load_mock(code)

    # 1시간 캐시 HIT
    if _cache_valid(code):
        return {**_insight_cache[code]["data"], "cached": True}

    # Gemini 호출
    try:
        result = _call_gemini(code, stock_data)
        _insight_cache[code] = {"data": result, "updated_at": _now()}
        return {**result, "cached": False}
    except Exception as e:
        logger.warning(f"Gemini call failed [{code}]: {e} → mock fallback")
        return _load_mock(code)


# ── Gemini API 호출 ───────────────────────────────────────────────────────

def _call_gemini(code: str, stock_data: dict) -> dict:
    from google import genai  # google-genai 신 SDK (from google import genai)

    client   = genai.Client(api_key=GEMINI_API_KEY)
    prompt   = _build_prompt(stock_data)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    return _parse_response(response.text)


def _build_prompt(data: dict) -> str:
    code   = data.get("code", "")
    name   = data.get("name", code)
    market = "한국" if str(code).isdigit() else "미국"

    supply = data.get("supply_recent") or {}
    if supply:
        supply_text = (
            f"개인 {supply.get('individual', 0):+,}만원 / "
            f"외국인 {supply.get('foreign', 0):+,}만원 / "
            f"기관 {supply.get('institution', 0):+,}만원"
        )
    else:
        supply_text = "수급 데이터 없음"

    rsi          = data.get("rsi")
    rsi_str      = f"{rsi:.1f}" if rsi is not None else "N/A"
    position_pct = data.get("position_pct")
    pos_str      = f"{position_pct:.1f}" if position_pct is not None else "N/A"

    return f"""당신은 {market} 주식 시장 전문 애널리스트입니다.
아래 {name}({code}) 종목 데이터를 분석하여 개미 투자자를 위한 투자 방향성을 제시하세요.

[종목 데이터]
- 현재가: {data.get('price', 'N/A')}  등락률: {data.get('change_pct', 0):+.2f}%
- RSI(14일): {rsi_str}
- 실루엣 구간: {data.get('signal_text', 'N/A')} (52주 위치 {pos_str}%)
- PER: {data.get('per', 'N/A')}  PBR: {data.get('pbr', 'N/A')}  ROE: {data.get('roe', 'N/A')}%  EPS: {data.get('eps', 'N/A')}
- 최근 5일 수급 합산: {supply_text}

[출력 규칙 — 아래 JSON 형식만 출력, 다른 텍스트 절대 금지]
{{
  "summary": "20자 이내 한 줄 요약",
  "reason": "1. 첫 번째 근거 (RSI·기술적 지표)\n2. 두 번째 근거 (수급·외국인·기관 동향)\n3. 세 번째 근거 (밸류에이션·업황 전망)"
}}

[제약 조건]
- summary는 반드시 20자 이내
- reason 각 항목은 1문장, 간결하게
- 투자 권유 표현 사용 금지
- JSON 외 텍스트 출력 금지"""


def _parse_response(text: str) -> dict:
    """Gemini 응답에서 JSON 추출 및 파싱. 마크다운 코드블록 자동 제거."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines   = cleaned.splitlines()
        cleaned = "\n".join(
            ln for ln in lines if not ln.strip().startswith("```")
        ).strip()

    parsed  = json.loads(cleaned)
    summary = str(parsed.get("summary", "")).strip()[:20]  # 20자 강제 상한
    reason  = str(parsed.get("reason", "")).strip()

    return {
        "summary":    summary,
        "reason":     reason,
        "disclaimer": _DISCLAIMER,
    }


# ── Mock / 캐시 유틸 ──────────────────────────────────────────────────────

def _cache_valid(code: str) -> bool:
    if code not in _insight_cache:
        return False
    elapsed = (_now() - _insight_cache[code]["updated_at"]).total_seconds()
    return elapsed < INSIGHT_CACHE_SEC


def _load_mock(code: str) -> dict:
    path = os.path.join(MOCK_DIR, f"insight_{code}.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {**data, "cached": True}
    except FileNotFoundError:
        logger.warning(f"insight mock not found: insight_{code}.json")
        return {
            "summary":    "AI 인사이트 준비 중",
            "reason":     (
                "1. 현재 데이터를 분석 중입니다.\n"
                "2. 잠시 후 다시 시도해 주세요.\n"
                "3. 문제가 지속되면 새로고침해 주세요."
            ),
            "disclaimer": _DISCLAIMER,
            "cached":     True,
        }


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Market-level insight ──────────────────────────────────────────────────

_market_insight_cache: dict = {}

def get_market_insight(context: dict) -> dict:
    """
    시장 전반 컨텍스트를 받아 .plain-help 용 한국어 설명 3종 반환.

    Parameters
    ----------
    context : {
        indices: [{name, value, change_pct}],
        fear_greed_kr: {score, status},
        fear_greed_us: {score, status},
        buffett: {value, status}
    }

    Returns
    -------
    {
        indices_summary : str,
        fear_greed_kr   : str,
        fear_greed_us   : str,
        buffett         : str,
        cached          : bool,
    }
    """
    if API_MODE == "mock" or not GEMINI_API_KEY:
        return _mock_market_insight()

    cache_ttl = 1800  # 30분
    if _market_insight_cache:
        elapsed = (_now() - _market_insight_cache.get("updated_at", _now())).total_seconds()
        if elapsed < cache_ttl:
            return {**_market_insight_cache["data"], "cached": True}

    try:
        result = _call_market_gemini(context)
        _market_insight_cache["data"] = result
        _market_insight_cache["updated_at"] = _now()
        return {**result, "cached": False}
    except Exception as e:
        logger.warning(f"Market Gemini call failed: {e} → mock fallback")
        return _mock_market_insight()


def _call_market_gemini(context: dict) -> dict:
    from google import genai

    client   = genai.Client(api_key=GEMINI_API_KEY)
    prompt   = _build_market_prompt(context)
    response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    return _parse_market_response(response.text)


def _build_market_prompt(ctx: dict) -> str:
    indices    = ctx.get("indices", [])
    fg_kr      = ctx.get("fear_greed_kr", {})
    fg_us      = ctx.get("fear_greed_us", {})
    buffett    = ctx.get("buffett", {})

    idx_lines = "\n".join(
        f"  - {i.get('name')}: {i.get('value', 'N/A')} ({i.get('change_pct', 0):+.2f}%)"
        for i in indices
    ) or "  - 데이터 없음"

    return f"""당신은 개미 투자자를 위한 시장 해설 전문가입니다.
아래 오늘의 시장 데이터를 바탕으로, 초보 투자자도 쉽게 이해할 수 있도록 각 항목에 대한 한국어 설명을 작성하세요.

[주요 지수]
{idx_lines}

[공포 & 탐욕 지수]
  - 국내 (KR): 점수 {fg_kr.get('score', 50)} / 상태 {fg_kr.get('status', '?')}
  - 미국 (US): 점수 {fg_us.get('score', 50)} / 상태 {fg_us.get('status', '?')}

[버핏 지수]
  - 수치: {buffett.get('value', 'N/A')}% / 상태 {buffett.get('status', '?')}
    (undervalued < 70, neutral 70–100, overvalued 100–150, bubble ≥ 150)

[출력 규칙 — 아래 JSON 형식만 출력, 다른 텍스트 절대 금지]
{{
  "indices_summary": "지수 전반 흐름을 2–3문장으로. 핵심 단어는 <b>태그</b>로 강조.",
  "fear_greed_kr":   "국내 공포탐욕 점수에 근거한 설명 2–3문장. 핵심 단어 <b>강조</b>.",
  "fear_greed_us":   "미국 공포탐욕 점수에 근거한 설명 2–3문장. 핵심 단어 <b>강조</b>.",
  "buffett":         "버핏지수 수치에 근거한 설명 2–3문장. 핵심 단어 <b>강조</b>."
}}

[제약 조건]
- 각 항목 최대 80자, 핵심만 간결하게
- 투자 권유 표현 사용 금지 (예: "매수하세요" 금지)
- 반드시 HTML <b> 태그로 핵심 단어 1–2개 강조
- JSON 외 텍스트 출력 금지"""


def _parse_market_response(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines   = cleaned.splitlines()
        cleaned = "\n".join(ln for ln in lines if not ln.strip().startswith("```")).strip()
    parsed = json.loads(cleaned)
    return {
        "indices_summary": str(parsed.get("indices_summary", "")).strip(),
        "fear_greed_kr":   str(parsed.get("fear_greed_kr", "")).strip(),
        "fear_greed_us":   str(parsed.get("fear_greed_us", "")).strip(),
        "buffett":         str(parsed.get("buffett", "")).strip(),
    }


def _mock_market_insight() -> dict:
    return {
        "indices_summary": "오늘은 <b>국내는 약하고 미국은 강한</b> 흐름이에요. 엇갈린 분위기에선 한쪽에 베팅하기보다 <b>두 시장에 나눠 담아 두는 전략</b>이 안전해요.",
        "fear_greed_kr":   "지금 국내 시장은 <b>공포 구간</b>이에요. 투자자들이 겁을 내고 있어, 좋은 종목을 <b>싸게 살 기회</b>가 될 수 있어요. 나눠서 천천히 들어가 보세요.",
        "fear_greed_us":   "미국 시장은 <b>탐욕 구간</b>이에요. 분위기가 좋아 사람들이 적극적으로 매수 중이지만, <b>단기 과열</b> 신호이기도 해요.",
        "buffett":         "시장 전체가 <b>많이 비싸진 상태</b>예요. 과거 같은 수치 이후엔 조정이 자주 있었어요. <b>새로 크게 들어가긴 부담스럽고</b>, 분산 관리를 권장해요.",
        "cached": True,
    }
