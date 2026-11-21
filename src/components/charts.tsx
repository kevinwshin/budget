import { useState } from 'react';
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

export interface LineSeries {
  /** Shown in the readout; a lone series may leave it out. */
  name?: string;
  values: number[];
  color: string;
  dashed?: boolean;
}

/**
 * Line chart on one shared y-scale that starts at 0. A readout above the chart shows the
 * selected point's values; tapping a column selects it, and the newest point starts selected.
 */
export function Line({ labels, series, height = 120 }: { labels: string[]; series: LineSeries[]; height?: number }) {
  const [sel, setSel] = useState(labels.length - 1);
  const H = height;
  const all = series.flatMap((s) => s.values);
  const lo = Math.min(0, ...all);
  const hi = Math.max(0, ...all);
  const span = hi - lo || 1;
  const top = 16;
  const bottom = H - 5;
  const step = (W - 30) / Math.max(labels.length - 1, 1);
  const x = (i: number) => 15 + i * step;
  const y = (v: number) => bottom - ((v - lo) / span) * (bottom - top);
  const readout = series.length === 1 && !series[0].name
    ? formatMoney(series[0].values[sel])
    : series.map((s) => `${s.name} ${formatMoney(s.values[sel])}`).join(' · ');
  return (
    <>
      <div className="readout">{labels[sel]}: {readout}</div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%">
        <line x1={0} x2={W} y1={top} y2={top} stroke="var(--line)" />
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--line)" />
        <text x={0} y={top - 5}>{formatMoney(hi)}</text>
        <line x1={x(sel)} x2={x(sel)} y1={top} y2={bottom} stroke="var(--line)" strokeWidth={2} />
        {series.map((s, k) => (
          <g key={k}>
            <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dashed ? '6 4' : undefined} />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={s.color} />)}
          </g>
        ))}
        {labels.map((l, i) => <text key={l + i} x={5 + i * step} y={H + 14}>{l}</text>)}
        {labels.map((_, i) => (
          <rect key={'hit' + i} x={x(i) - step / 2} y={0} width={step} height={H + 18} fill="transparent"
            onPointerEnter={() => setSel(i)} onClick={() => setSel(i)} />
        ))}
      </svg>
    </>
  );
}
