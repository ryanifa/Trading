import { useMemo, useRef, useState } from "react";
import { Quote } from "../types";
import { formatPct, formatPrice, formatTime } from "../lib/format";

const RANGES = [
  { key: "1u", label: "1u", ms: 3600_000 },
  { key: "3u", label: "3u", ms: 3 * 3600_000 },
  { key: "alles", label: "Alles", ms: Infinity },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const W = 640;
const H = 260;
const PAD = { top: 10, right: 8, bottom: 22, left: 56 };

interface Hover {
  x: number;
  y: number;
  t: number;
  p: number;
}

export function PriceChart({ quote, name }: { quote: Quote; name: string }) {
  const [range, setRange] = useState<RangeKey>("1u");
  const [hover, setHover] = useState<Hover | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const rangeMs = RANGES.find((r) => r.key === range)!.ms;
  const points = useMemo(() => {
    if (rangeMs === Infinity) return quote.history;
    const cutoff = Date.now() - rangeMs;
    return quote.history.filter((pt) => pt.t >= cutoff);
  }, [quote.history, rangeMs]);

  const { path, xOf, yOf, ticks, tMin, tMax } = useMemo(() => {
    const ts = points.map((pt) => pt.t);
    const ps = points.map((pt) => pt.p);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);
    let pMin = Math.min(...ps);
    let pMax = Math.max(...ps);
    if (pMax === pMin) {
      pMax += 1;
      pMin -= 1;
    }
    const padP = (pMax - pMin) * 0.08;
    pMin -= padP;
    pMax += padP;

    const xOf = (t: number) =>
      PAD.left + ((t - tMin) / (tMax - tMin || 1)) * (W - PAD.left - PAD.right);
    const yOf = (p: number) =>
      PAD.top + (1 - (p - pMin) / (pMax - pMin)) * (H - PAD.top - PAD.bottom);

    const path = points
      .map((pt, i) => `${i === 0 ? "M" : "L"}${xOf(pt.t).toFixed(1)},${yOf(pt.p).toFixed(1)}`)
      .join("");

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const p = pMin + f * (pMax - pMin);
      return { p, y: yOf(p) };
    });

    return { path, xOf, yOf, ticks, tMin, tMax };
  }, [points]);

  const first = points[0]?.p ?? quote.price;
  const change = quote.price - first;
  const changePct = first ? change / first : 0;
  const dirClass = change >= 0 ? "up" : "down";
  const arrow = change >= 0 ? "▲" : "▼";

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || points.length === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = tMin + ((px - PAD.left) / (W - PAD.left - PAD.right)) * (tMax - tMin);
    let nearest = points[0];
    for (const pt of points) {
      if (Math.abs(pt.t - t) < Math.abs(nearest.t - t)) nearest = pt;
    }
    setHover({ x: xOf(nearest.t), y: yOf(nearest.p), t: nearest.t, p: nearest.p });
  }

  return (
    <div className="card">
      <div className="chart-head">
        <div>
          <h2>
            {name} ({quote.symbol})
          </h2>
          <div className="price">{formatPrice(quote.price)}</div>
          <div className={`delta ${dirClass}`}>
            {arrow} {formatPrice(Math.abs(change))} ({formatPct(changePct)})
          </div>
        </div>
        <div className="range-row" role="group" aria-label="Periode">
          {RANGES.map((r) => (
            <button
              key={r.key}
              className={r.key === range ? "active" : ""}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`Koersgrafiek van ${name}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={tick.y}
                y2={tick.y}
                stroke="var(--gridline)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-muted)"
              >
                {formatPrice(tick.p)}
              </text>
            </g>
          ))}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={H - PAD.bottom}
            y2={H - PAD.bottom}
            stroke="var(--baseline)"
            strokeWidth="1"
          />
          <text
            x={PAD.left}
            y={H - 6}
            fontSize="11"
            fill="var(--text-muted)"
          >
            {formatTime(tMin)}
          </text>
          <text
            x={W - PAD.right}
            y={H - 6}
            textAnchor="end"
            fontSize="11"
            fill="var(--text-muted)"
          >
            {formatTime(tMax)}
          </text>

          <path d={path} fill="none" stroke="var(--series-1)" strokeWidth="2" />

          {hover && (
            <g>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--baseline)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={hover.x}
                cy={hover.y}
                r="4"
                fill="var(--series-1)"
                stroke="var(--surface-1)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {hover && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(hover.x / W) * 100}%`,
              top: `${(hover.y / H) * 100}%`,
            }}
          >
            <div>{formatPrice(hover.p)}</div>
            <div className="t">{formatTime(hover.t)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
