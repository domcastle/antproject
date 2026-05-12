'use client';

function interpret(beta: number) {
  if (beta >= 1.8)  return { txt: '매우 출렁임', c: '#ff5b5b' };
  if (beta >= 1.3)  return { txt: '공격형',     c: '#ff8a4a' };
  if (beta >= 1.05) return { txt: '약간 공격형', c: '#f5a623' };
  if (beta >= 0.9)  return { txt: '시장과 비슷', c: '#aab2bf' };
  return                  { txt: '안정형',     c: '#c8a464' };
}

export default function M7Card({ betas, live }: {
  betas: { code: string; name: string; beta: number }[];
  live: boolean;
}) {
  return (
    <div className="card">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="kicker">Magnificent 7</div>
          <h2 className="headline text-xl text-fg mt-1">베타 계수</h2>
        </div>
        <div className={`text-[10px] font-mono tracking-[0.14em] uppercase ${live ? 'text-emerald-400' : 'text-amber-500'}`}>
          {live ? '● Live' : '○ Mock'}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_60px_92px_72px] gap-x-4 pb-2 border-b border-line text-[10px] font-mono tracking-[0.14em] uppercase text-fg-3">
        <span>Stock</span>
        <span className="text-right">Beta</span>
        <span>해석</span>
        <span></span>
      </div>
      <div className="divide-y divide-line/50">
        {betas.map(b => {
          const i = interpret(b.beta);
          return (
            <div key={b.code} className="grid grid-cols-[1fr_60px_92px_72px] gap-x-4 items-center py-3 text-sm">
              <div>
                <span className="text-fg">{b.name}</span>
                <span className="font-mono text-[10px] text-fg-3 ml-2">{b.code}</span>
              </div>
              <div className={`num text-right font-semibold ${b.beta >= 1.5 ? 'text-[#ff7777]' : b.beta < 0.8 ? 'text-[#4a90ff]' : 'text-fg'}`}>
                {b.beta.toFixed(2)}
              </div>
              <div className="text-xs font-semibold" style={{ color: i.c }}>{i.txt}</div>
              <div className="h-1 bg-bg-3 rounded-full relative">
                <div className="absolute inset-y-0 left-0 rounded-full" style={{
                  width: `${Math.min(b.beta / 2.5, 1) * 100}%`,
                  background: b.beta >= 1.5 ? '#ff7777' : '#c8a464',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
