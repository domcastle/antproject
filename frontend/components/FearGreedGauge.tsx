'use client';

interface Props {
  value: number;
  label: string;
  previousClose?: number;
  weekAgo?: number;
  monthAgo?: number;
}

function getColor(score: number): string {
  if (score <= 20) return '#0d47a1';
  if (score <= 40) return '#1976d2';
  if (score <= 60) return '#8B95A1';
  if (score <= 80) return '#ffcc02';
  return '#FF4D4D';
}

const ZONE_COLORS = ['#0d47a1', '#1976d2', '#8B95A1', '#ffcc02', '#FF4D4D'];

export default function FearGreedGauge({ value, label, previousClose, weekAgo, monthAgo }: Props) {
  const color = getColor(value);
  // needle: 0→left(180°) 100→right(0°), so angle = 180 - value*1.8 degrees
  const needleAngle = (180 - value * 1.8) * (Math.PI / 180);
  const cx = 60, cy = 60, r = 48;
  const nx = cx + 42 * Math.cos(needleAngle);
  const ny = cy - 42 * Math.sin(needleAngle);

  return (
    <div>
      <div className="flex justify-center mb-1">
        <svg viewBox="0 0 120 68" className="w-44">
          {ZONE_COLORS.map((c, i) => {
            const startDeg = 180 - i * 36;
            const endDeg   = 180 - (i + 1) * 36;
            const s = startDeg * (Math.PI / 180);
            const e = endDeg   * (Math.PI / 180);
            const x1 = cx + r * Math.cos(s), y1 = cy - r * Math.sin(s);
            const x2 = cx + r * Math.cos(e), y2 = cy - r * Math.sin(e);
            return (
              <path key={i}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2} Z`}
                fill={c} opacity={0.3}
              />
            );
          })}
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="4" fill={color} />
          <text x={cx} y={cy - 10} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{value}</text>
        </svg>
      </div>
      <div className="text-center text-xs font-semibold mb-3" style={{ color }}>{label}</div>
      {(previousClose !== undefined || weekAgo !== undefined || monthAgo !== undefined) && (
        <div className="flex justify-around text-[9px] text-gray-500">
          {previousClose !== undefined && <div className="text-center"><div className="text-gray-300">{previousClose}</div><div>전일</div></div>}
          {weekAgo      !== undefined && <div className="text-center"><div className="text-gray-300">{weekAgo}</div><div>1주전</div></div>}
          {monthAgo     !== undefined && <div className="text-center"><div className="text-gray-300">{monthAgo}</div><div>1개월전</div></div>}
        </div>
      )}
    </div>
  );
}
