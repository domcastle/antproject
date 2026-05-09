'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CALENDAR_EVENTS } from '@/lib/mockData';
import type { CalendarEvent } from '@/lib/types';

const EVENT_STYLES: Record<CalendarEvent['type'], { bg: string; text: string; border: string; icon: string; label: string }> = {
  earnings: { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE', icon: '📊', label: '실적' },
  rate:     { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', icon: '🏦', label: '금리' },
  cpi:      { bg: '#FEF9C3', text: '#CA8A04', border: '#FEF08A', icon: '📈', label: 'CPI'  },
  witching: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', icon: '⚡', label: '위칭' },
};

function getDDay(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function getMonth(year: number, month: number): string[] {
  const days: string[] = [];
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getMonth() !== month - 1) break;
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const year  = 2026;
  const month = 5;

  const days            = getMonth(year, month);
  const firstDayOfWeek  = new Date(year, month - 1, 1).getDay();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [fearScore, setFearScore]       = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/fear-greed')
      .then(r => r.json())
      .then(d => { if (d.value !== undefined) setFearScore(d.value); })
      .catch(() => {});
  }, []);

  const eventsByDate: Record<string, CalendarEvent[]> = {};
  CALENDAR_EVENTS.forEach(e => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });

  const warnings: string[] = [];
  CALENDAR_EVENTS.filter(e => e.type === 'witching').forEach(e => {
    const diff = Math.round((new Date(e.date).getTime() - today.getTime()) / 86400000);
    if (Math.abs(diff) <= 3) {
      const when = diff === 0 ? '오늘' : diff > 0 ? `${diff}일 후` : `${Math.abs(diff)}일 전`;
      warnings.push(`⚡ 선물/옵션 만기일(${e.date}) ${when} — 변동성 주의`);
    }
  });
  if (fearScore !== null && fearScore < 20)  warnings.push('😱 공포탐욕지수 20 미만 — 극도의 공포 구간, 과도한 투자 결정 주의');
  if (fearScore !== null && fearScore > 80)  warnings.push('🤑 공포탐욕지수 80 초과 — 극도의 과열 구간, 고점 매수 주의');

  const upcomingEvents = [...CALENDAR_EVENTS]
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="min-h-screen">
      {/* 동적 경고 배너 */}
      {warnings.length > 0 ? (
        warnings.map((w, i) => (
          <div key={i} className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-center gap-2 text-red-400 text-xs">
            {w}
          </div>
        ))
      ) : (
        <div className="bg-green-500/5 border-b border-green-500/20 px-4 py-2 flex items-center gap-2 text-green-600 text-xs">
          ✅ 현재 특별한 시장 경고 없음
        </div>
      )}

      <nav className="border-b border-[#1e2330] bg-[#0a0d14]/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">← 🐜 Ant Insight</Link>
          <span className="text-gray-600">/</span>
          <span className="text-white font-semibold">📅 개미의 달력</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-white mb-1">📅 개미의 달력</h1>
          <p className="text-sm text-gray-400">2026년 5월 · 실적 발표, 금리 결정, CPI, 쿼드러플 위칭데이</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-6">
          {Object.entries(EVENT_STYLES).map(([type, style]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <div className="w-5 h-5 rounded flex items-center justify-center text-[10px]"
                style={{ backgroundColor: style.bg, color: style.text }}>
                {style.icon}
              </div>
              <span className="text-gray-400">[{style.label}]</span>
            </div>
          ))}
          <span className="text-[10px] text-gray-600 ml-auto self-center">이벤트 있는 날짜를 클릭하면 상세 정보를 볼 수 있어요</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="xl:col-span-2 bg-[#0f1117] border border-[#1e2330] rounded-2xl p-4">
            <div className="text-sm font-bold text-white mb-4 text-center">2026년 5월</div>

            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {days.map(dateStr => {
                const dayNum    = parseInt(dateStr.split('-')[2]);
                const dayOfWeek = new Date(dateStr).getDay();
                const isToday   = dateStr === todayStr;
                const events    = eventsByDate[dateStr] || [];
                const hasWitching = events.some(e => e.type === 'witching');
                const isSelected  = selectedDate === dateStr;
                const hasEvents   = events.length > 0;

                return (
                  <div
                    key={dateStr}
                    onClick={() => hasEvents ? setSelectedDate(isSelected ? null : dateStr) : null}
                    className={`aspect-square rounded-xl p-1 flex flex-col transition-all duration-150 ${
                      hasEvents ? 'cursor-pointer' : ''
                    } ${
                      isSelected   ? 'ring-2 ring-[#3182F6] bg-[#3182F6]/10' :
                      isToday      ? 'bg-[#3182F6]/20 border border-[#3182F6]/50' :
                      hasWitching  ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20' :
                      hasEvents    ? 'bg-[#1e2330] border border-[#2d3748] hover:bg-[#252d3d]' :
                      'hover:bg-[#0a0d14]'
                    }`}
                  >
                    <div className={`text-xs font-medium ${
                      isToday     ? 'text-[#3182F6]' :
                      isSelected  ? 'text-white' :
                      dayOfWeek === 0 ? 'text-red-400' :
                      dayOfWeek === 6 ? 'text-blue-400' :
                      'text-gray-300'
                    }`}>
                      {dayNum}
                      {isToday && <span className="ml-0.5 text-[8px]">●</span>}
                    </div>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {events.slice(0, 3).map((e, i) => {
                        const style = EVENT_STYLES[e.type];
                        return (
                          <div key={i} className="text-[9px] px-1 rounded font-medium"
                            style={{ backgroundColor: style.bg, color: style.text }}
                            title={e.title}>
                            {style.icon}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar: 예정 이벤트 */}
          <div className="space-y-4">
            <div className="bg-[#0f1117] border border-[#1e2330] rounded-2xl p-4">
              <div className="text-sm font-bold text-white mb-4">예정 이벤트</div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {upcomingEvents.map((event, i) => {
                  const style  = EVENT_STYLES[event.type];
                  const dday   = getDDay(event.date);
                  const isPast = dday.startsWith('D+');

                  return (
                    <div key={i}
                      className="flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer hover:opacity-90"
                      style={{
                        borderColor:     isPast ? '#1e2330' : style.border + '80',
                        backgroundColor: isPast ? 'transparent' : style.bg + '15',
                        opacity:         isPast ? 0.5 : 1,
                      }}
                      onClick={() => setSelectedDate(event.date)}
                    >
                      <div className="text-[10px] font-bold px-1.5 py-1 rounded min-w-[36px] text-center flex-shrink-0"
                        style={{ backgroundColor: style.bg, color: style.text }}>
                        {dday}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs">{style.icon}</span>
                          <span className="text-xs font-semibold text-white">{event.title}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: style.bg, color: style.text }}>
                            [{style.label}]
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{event.description}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{event.date}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 개미의 조언 */}
            <div className="bg-[#0f1117] border border-[#1e2330] rounded-2xl p-4">
              <div className="text-xs font-bold text-white mb-3">🐜 개미의 조언</div>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex gap-2"><span>⚡</span><span>쿼드러플 위칭데이 전후는 선물·옵션 만기로 변동성이 커져요!</span></div>
                <div className="flex gap-2"><span>🏦</span><span>FOMC 회의 결과 발표 시간은 새벽 3시 — 다음날 시장 주시!</span></div>
                <div className="flex gap-2"><span>📊</span><span>실적 발표 전후 급등·급락이 자주 발생해요. 미리 보유 여부를 결정하세요.</span></div>
                <div className="flex gap-2"><span>📈</span><span>CPI 발표는 금리 방향성에 영향을 줘서 주식 시장 전체가 흔들릴 수 있어요.</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[10px] text-gray-600">
          이 정보는 참고용입니다 · 모든 투자 결정의 책임은 투자자 본인에게 있습니다
        </div>
      </div>

      {/* 이벤트 상세 팝업 */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="bg-[#0f1117] border border-[#1e2330] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-base font-extrabold text-white">{selectedDate}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {getDDay(selectedDate)} · {(eventsByDate[selectedDate] || []).length}개 이벤트
                </div>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {(eventsByDate[selectedDate] || []).length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">이 날짜에 이벤트가 없어요</div>
            ) : (
              <div className="space-y-3">
                {(eventsByDate[selectedDate] || []).map((e, i) => {
                  const style = EVENT_STYLES[e.type];
                  return (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl border"
                      style={{ backgroundColor: style.bg + '18', borderColor: style.border + '60' }}>
                      <span className="text-2xl flex-shrink-0">{style.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold text-white">{e.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                            style={{ backgroundColor: style.bg, color: style.text }}>
                            {style.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">{e.description}</div>
                        <div className="mt-2">
                          <span className="text-xs font-bold px-2 py-1 rounded"
                            style={{ backgroundColor: style.bg, color: style.text }}>
                            {getDDay(selectedDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setSelectedDate(null)}
              className="mt-5 w-full py-2 rounded-xl text-xs font-medium text-gray-400 border border-[#1e2330] hover:border-[#3182F6] hover:text-white transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
