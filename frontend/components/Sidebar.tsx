'use client';
import Link from 'next/link';

export default function Sidebar({ active }: { active: 'home' | 'calendar' | 'stock' }) {
  const items = [
    { id: 'home',     href: '/',         label: '시장 요약',     kicker: 'Overview' },
    { id: 'stock',    href: '/stock/005930', label: '종목 분석', kicker: 'Stock' },
    { id: 'calendar', href: '/calendar', label: '개미의 달력', kicker: 'Calendar' },
  ];
  return (
    <aside className="w-[220px] shrink-0 border-r border-line bg-bg-2 sticky top-0 h-screen flex flex-col">
      <div className="px-6 py-7 border-b border-line">
        <div className="kicker text-accent">Ant Insight</div>
        <div className="headline text-2xl mt-1 text-fg">개미인사이트</div>
        <div className="text-[11px] text-fg-3 mt-2">시장이 지금 어떤 상태인지,<br/>한 눈에.</div>
      </div>
      <nav className="flex-1 p-3">
        {items.map(it => (
          <Link key={it.id} href={it.href}
            className={`block px-4 py-3 rounded-md mb-1 transition-colors ${
              active === it.id
                ? 'bg-bg-3 border-l-2 border-accent'
                : 'hover:bg-bg-3/60 border-l-2 border-transparent'
            }`}>
            <div className={`text-[10px] tracking-[0.18em] uppercase font-mono ${active === it.id ? 'text-accent' : 'text-fg-3'}`}>{it.kicker}</div>
            <div className={`text-sm mt-0.5 ${active === it.id ? 'text-fg' : 'text-fg-2'}`}>{it.label}</div>
          </Link>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-line text-[10px] text-fg-3 leading-relaxed">
        <div className="font-mono tracking-[0.14em] uppercase text-accent mb-1">Disclaimer</div>
        분석 내용은 투자 권유가 아닙니다.<br/>
        준실시간(15분 지연).
      </div>
    </aside>
  );
}
