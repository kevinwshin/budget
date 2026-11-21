import { formatMoney } from '../money';

const W = 340;

/** Horizontal bars: one row per label, one bar per series inside the row. */
export function HBars({ rows, colors }: { rows: { label: string; values: number[] }[]; colors: string[] }) {
  if (!rows.length) return <div className="note">No data for this period.</div>;
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  const barH = 14;
  const gap = 4;
  const rowH = rows[0].values.length * (barH + gap) + 8;
  const labelW = 96;
  const valueW = 74;
  return (
    <svg viewBox={`0 0 ${W} ${rows.length * rowH}`} width="100%">
      {rows.map((r, i) => (
        <g key={r.label + i} transform={`translate(0 ${i * rowH})`}>
          <text x={0} y={(r.values.length * (barH + gap)) / 2 + 3}>{r.label.length > 15 ? r.label.slice(0, 14) + '…' : r.label}</text>
          {r.values.map((v, k) => {
            const w = (Math.max(v, 0) / max) * (W - labelW - valueW);
            const y = k * (barH + gap);
            return (
              <g key={k}>
                <rect x={labelW} y={y} width={Math.max(w, 1)} height={barH} rx={3} fill={colors[k]} />
                <text x={labelW + w + 4} y={y + 11}>{formatMoney(v)}</text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

export function Line({ labels, values }: { labels: string[]; values: number[] }) {
  const H = 120;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const step = (W - 30) / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => [15 + i * step, H - ((v - lo) / span) * (H - 10) - 5] as const);
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--primary)" strokeWidth={2.5} />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.5} fill="var(--primary)" />)}
      {labels.map((l, i) => <text key={l + i} x={5 + i * step} y={H + 14}>{l}</text>)}
    </svg>
  );
}
