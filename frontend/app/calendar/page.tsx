'use client';
import { useState, useMemo, useEffect } from 'react';
import { CALENDAR_EVENTS, type CalendarEventData } from '@/lib/mockData';
import { fetchCalendar, fetchFearGreedKR, fetchFearGreedUS } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import SectionTitle from '@/components/SectionTitle';

type ApiEvent = CalendarEventData & { d_day?: number };

const TYPE_META: Record<string, { label: string; color: string; emoji: string; desc: string }> = {
  earnings: { label: '실적',  color: '#42a5f5', emoji: '📊', desc: '기업 분기 실적 발표일. 예상치 대비 서프라이즈 여부에 따라 주가 변동성이 커질 수 있어요.' },
  rate:     { label: 'FOMC', color: '#f5a623', emoji: '🏛',  desc: '미국 연준(Fed)의 기준금리 결정 회의. 금리 방향에 따라 전체 시장에 영향을 줘요.' },
  cpi:      { label: 'CPI',  color: '#c8a464', emoji: '📈', desc: '미국 소비자물가지수 발표. 인플레이션 추이를 보여주며 금리 결정의 핵심 지표예요.' },
  witching: { label: '위칭', color: '#ff5b5b', emoji: '⚠',  desc: '선물·옵션 만기가 겹치는 날. 기관의 대규모 포지션 정리로 변동성이 급격히 커질 수 있어요.' },
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<ApiEvent[]>(CALENDAR_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [fgKR, setFgKR] = useState<number | null>(null);
  const [fgUS, setFgUS] = useState<number | null>(null);

  useEffect(() => {
    fetchCalendar(year, month).then(r => r.json()).then(d => {
      const list: ApiEvent[] = Array.isArray(d) ? d : d?.events;
      if (Array.isArray(list) && list.length) setEvents(list);
    }).catch(() => {});
  }, [year, month]);

  useEffect(() => {
    fetchFearGreedKR().then(r => r.json()).then(d => {
      if (d.score !== undefined) setFgKR(d.score);
    }).catch(() => {});
    fetchFearGreedUS().then(r => r.json()).then(d => {
      const s = d.score ?? d.value;
      if (s !== undefined) setFgUS(s);
    }).catch(() => {});
  }, []);

  const grid = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startDow = first.getDay();
    const days = new Date(year, month, 0).getDate();
    const cells: { date: Date | null; events: ApiEvent[] }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null, events: [] });
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month - 1, d);
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const ev = events.filter(e => e.date === iso);
      cells.push({ date, events: ev });
    }
    while (cells.length % 7) cells.push({ date: null, events: [] });
    return cells;
  }, [year, month, events]);

  // d_day: 백엔드 값 우선, 없으면 프론트 계산
  const upcoming = useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return events
      .map(e => {
        const ddays = e.d_day !== undefined
          ? e.d_day
          : Math.round((new Date(e.date).getTime() - t.getTime()) / 86400000);
        return { ...e, ddays };
      })
      .filter(e => e.ddays >= 0 && e.ddays <= 60)
      .sort((a, b) => a.ddays - b.ddays)
      .slice(0, 8);
  }, [events]);

  // 경고 배너 조건: 위칭 ±3일 / 공포탐욕 <20 또는 >80
  const witchingSoon = upcoming.find(e => e.type === 'witching' && e.ddays <= 3);
  const fgExtreme = (fgKR !== null && (fgKR < 20 || fgKR > 80))
    ? { market: '국내', score: fgKR }
    : (fgUS !== null && (fgUS < 20 || fgUS > 80))
    ? { market: '미국', score: fgUS }
    : null;

  const prev = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const next = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  return (
    <div className="flex min-h-screen">
      <Sidebar active="calendar" />
      <main className="flex-1 overflow-x-hidden">
        <div className="px-10 py-8 max-w-[1400px] mx-auto">
          <div className="mb-6">
            <div className="kicker mb-2">Calendar</div>
            <h1 className="headline text-3xl text-fg">개미의 달력</h1>
          </div>

          {/* 경고 배너 — 위칭 ±3일 */}
          {witchingSoon && (
            <div className="mb-4 p-4 rounded-lg border border-[#ff5b5b]/40 bg-[#ff5b5b]/8 flex items-center gap-3">
              <div className="text-2xl">⚠</div>
              <div>
                <div className="text-sm text-fg font-semibold">위칭데이 임박 — {witchingSoon.date}</div>
                <div className="text-[11px] text-fg-2 mt-0.5">D-{witchingSoon.ddays} · 변동성 확대 가능. 신규 진입은 신중하게.</div>
              </div>
            </div>
          )}

          {/* 경고 배너 — 공포탐욕 극단 */}
          {fgExtreme && (
            <div className="mb-4 p-4 rounded-lg border border-[#f5a623]/40 bg-[#f5a623]/8 flex items-center gap-3">
              <div className="text-2xl">{fgExtreme.score < 20 ? '😱' : '🤑'}</div>
              <div>
                <div className="text-sm text-fg font-semibold">
                  {fgExtreme.market} 공포탐욕 {fgExtreme.score < 20 ? '극단적 공포' : '극단적 탐욕'} ({fgExtreme.score}점)
                </div>
                <div className="text-[11px] text-fg-2 mt-0.5">
                  {fgExtreme.score < 20
                    ? '시장 심리가 매우 불안정해요. 분할 매수 전략을 고려해 보세요.'
                    : '과열 신호가 감지됐어요. 신규 비중 확대는 신중하게.'}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
            {/* Calendar grid */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button onClick={prev} className="w-8 h-8 rounded-md border border-line hover:bg-bg-3 text-fg-2">‹</button>
                  <h2 className="headline text-xl text-fg num">{year}.{String(month).padStart(2, '0')}</h2>
                  <button onClick={next} className="w-8 h-8 rounded-md border border-line hover:bg-bg-3 text-fg-2">›</button>
                </div>
                <div className="flex gap-3 text-[11px]">
                  {Object.entries(TYPE_META).map(([k, m]) => (
                    <span key={k} className="flex items-center gap-1.5 text-fg-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-7 border-l border-t border-line">
                {WEEKDAYS.map((d, i) => (
                  <div key={d} className="px-2 py-2 text-[10px] font-mono uppercase tracking-[0.14em] border-r border-b border-line"
                       style={{ color: i === 0 ? '#ff5b5b' : i === 6 ? '#4a90ff' : '#6f7785' }}>
                    {d}
                  </div>
                ))}
                {grid.map((cell, i) => {
                  const isToday = cell.date && cell.date.toDateString() === today.toDateString();
                  const hasEvents = cell.events.length > 0;
                  return (
                    <div
                      key={i}
                      onClick={() => hasEvents && setSelectedEvent(cell.events[0])}
                      className={`min-h-[88px] border-r border-b border-line p-2 ${cell.date ? '' : 'bg-bg-3/30'} ${hasEvents ? 'cursor-pointer hover:bg-bg-3/50 transition-colors' : ''}`}
                    >
                      {cell.date && (
                        <>
                          <div className={`num text-xs ${isToday ? 'text-accent font-semibold' : 'text-fg-2'}`}>
                            {cell.date.getDate()}
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {cell.events.map((ev, j) => {
                              const m = TYPE_META[ev.type];
                              return (
                                <div key={j} className="text-[10px] px-1.5 py-0.5 rounded truncate"
                                     style={{ background: m.color + '18', color: m.color, border: `1px solid ${m.color}33` }}
                                     title={ev.title}>
                                  {m.emoji} {ev.title}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming */}
            <div className="card">
              <SectionTitle kicker="Upcoming" title="다가오는 일정" />
              <div className="space-y-2">
                {upcoming.length === 0 && (
                  <p className="text-fg-3 text-sm py-4 text-center">이번 달 예정된 이벤트가 없어요.</p>
                )}
                {upcoming.map((e, i) => {
                  const m = TYPE_META[e.type];
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedEvent(e)}
                      className="flex items-center gap-3 p-2.5 rounded-md border border-line hover:bg-bg-3/40 transition-colors cursor-pointer"
                    >
                      <div className="w-12 text-center">
                        <div className="num text-sm font-semibold" style={{ color: e.ddays <= 3 ? '#ff5b5b' : '#c8a464' }}>
                          D-{e.ddays}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                                style={{ background: m.color + '18', color: m.color }}>
                            {m.label}
                          </span>
                          <span className="font-mono text-[10px] text-fg-3">{e.date.slice(5)}</span>
                        </div>
                        <div className="text-sm text-fg mt-0.5 truncate">{e.title}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 이벤트 상세 팝업 */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="card w-full max-w-sm mx-4 relative"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const m = TYPE_META[selectedEvent.type];
              const ddays = selectedEvent.d_day !== undefined
                ? selectedEvent.d_day
                : Math.round((new Date(selectedEvent.date).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
              return (
                <>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-3 right-3 text-fg-3 hover:text-fg text-lg leading-none"
                  >✕</button>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded"
                          style={{ background: m.color + '22', color: m.color }}>
                      {m.label}
                    </span>
                  </div>
                  <div className="headline text-lg text-fg mb-1">{selectedEvent.title}</div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="num text-sm text-fg-2">{selectedEvent.date}</span>
                    <span className="num text-sm font-semibold" style={{ color: ddays <= 3 ? '#ff5b5b' : '#c8a464' }}>
                      {ddays === 0 ? 'D-Day' : ddays > 0 ? `D-${ddays}` : `D+${Math.abs(ddays)}`}
                    </span>
                  </div>
                  <p className="text-sm text-fg-2 leading-relaxed">{m.desc}</p>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
