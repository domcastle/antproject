'use client';
import { useState, useMemo, useEffect } from 'react';
import { CALENDAR_EVENTS, type CalendarEventData } from '@/lib/mockData';
import { fetchCalendar } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import SectionTitle from '@/components/SectionTitle';

const TYPE_META: Record<string, { label: string; color: string; emoji: string }> = {
  earnings: { label: '실적',   color: '#42a5f5', emoji: '📊' },
  rate:     { label: 'FOMC',  color: '#f5a623', emoji: '🏛' },
  cpi:      { label: 'CPI',   color: '#c8a464', emoji: '📈' },
  witching: { label: '위칭',  color: '#ff5b5b', emoji: '⚠' },
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEventData[]>(CALENDAR_EVENTS);

  useEffect(() => {
    fetchCalendar(year, month).then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : d?.events;
      if (Array.isArray(list) && list.length) setEvents(list);
    }).catch(() => {});
  }, [year, month]);

  const grid = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startDow = first.getDay();
    const days = new Date(year, month, 0).getDate();
    const cells: { date: Date | null; events: CalendarEventData[] }[] = [];
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

  const upcoming = useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return events
      .map(e => ({ ...e, ddays: Math.round((new Date(e.date).getTime() - t.getTime()) / 86400000) }))
      .filter(e => e.ddays >= 0 && e.ddays <= 60)
      .sort((a, b) => a.ddays - b.ddays)
      .slice(0, 8);
  }, [events]);

  const witchingSoon = upcoming.find(e => e.type === 'witching' && e.ddays <= 5);

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

          {witchingSoon && (
            <div className="mb-4 p-4 rounded-lg border border-[#ff5b5b]/40 bg-[#ff5b5b]/8 flex items-center gap-3">
              <div className="text-2xl">⚠</div>
              <div>
                <div className="text-sm text-fg font-semibold">위칭데이 임박 — {witchingSoon.date}</div>
                <div className="text-[11px] text-fg-2 mt-0.5">D-{witchingSoon.ddays} · 변동성 확대 가능. 신규 진입은 신중하게.</div>
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
                  return (
                    <div key={i} className={`min-h-[88px] border-r border-b border-line p-2 ${cell.date ? '' : 'bg-bg-3/30'}`}>
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
                {upcoming.map((e, i) => {
                  const m = TYPE_META[e.type];
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-md border border-line hover:bg-bg-3/40 transition-colors">
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
    </div>
  );
}
