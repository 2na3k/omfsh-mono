import { useState } from "react";
import type { ChartSpec, DataPoint, XYPoint } from "../../../shared/chart-types.js";

// ── constants ──────────────────────────────────────────────────────────────────

const W = 480;
const H = 260;
const M = { top: 28, right: 16, bottom: 48, left: 52 };
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

const PALETTE = [
  "var(--accent)",
  "#6a8fa7",
  "#7a9a6e",
  "#c49b5c",
  "#8e6aa8",
  "#b86a6a",
];

// ── tooltip ────────────────────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  value: string;
}

const TOOLTIP_HIDDEN: TooltipState = { visible: false, x: 0, y: 0, label: "", value: "" };

interface TooltipProps {
  state: TooltipState;
}

function Tooltip({ state }: TooltipProps) {
  if (!state.visible) return null;
  const text = `${state.label}: ${state.value}`;
  const tw = text.length * 6.5 + 12;
  const tx = Math.min(state.x + 8, W - tw - 4);
  const ty = Math.max(state.y - 28, M.top);
  return (
    <g>
      <rect
        x={tx - 4} y={ty - 14}
        width={tw} height={20}
        fill="var(--surface-overlay)"
        stroke="var(--border)"
        rx={4}
        style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.15))" }}
      />
      <text
        x={tx} y={ty}
        fontSize={10}
        fill="var(--text)"
        fontFamily="var(--font-mono)"
      >
        {text}
      </text>
    </g>
  );
}

// ── shared helpers ─────────────────────────────────────────────────────────────

function niceMax(val: number): number {
  if (val <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(val)));
  return Math.ceil(val / mag) * mag;
}

interface AxisProps {
  maxVal: number;
  xLabel?: string;
  yLabel?: string;
}

function Axes({ maxVal, xLabel, yLabel }: AxisProps) {
  const ticks = 5;
  return (
    <g>
      {/* y gridlines + ticks */}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (maxVal / ticks) * i;
        const y = M.top + IH - (IH * i) / ticks;
        return (
          <g key={i}>
            <line x1={M.left} y1={y} x2={M.left + IW} y2={y}
              stroke="var(--border)" strokeOpacity={0.5} strokeWidth={0.5} />
            <text x={M.left - 4} y={y + 3.5} textAnchor="end"
              fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)">
              {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(v < 10 ? 1 : 0)}
            </text>
          </g>
        );
      })}
      {/* axes */}
      <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + IH}
        stroke="var(--border-active)" strokeWidth={1} />
      <line x1={M.left} y1={M.top + IH} x2={M.left + IW} y2={M.top + IH}
        stroke="var(--border-active)" strokeWidth={1} />
      {/* axis labels */}
      {xLabel && (
        <text x={M.left + IW / 2} y={H - 4} textAnchor="middle"
          fontSize={10} fill="var(--text-secondary)" fontFamily="var(--font-sans)">
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          x={10} y={M.top + IH / 2}
          textAnchor="middle"
          fontSize={10} fill="var(--text-secondary)" fontFamily="var(--font-sans)"
          transform={`rotate(-90, 10, ${M.top + IH / 2})`}
        >
          {yLabel}
        </text>
      )}
    </g>
  );
}

// ── bar chart ──────────────────────────────────────────────────────────────────

interface BarProps {
  spec: Extract<ChartSpec, { type: "bar" }>;
  setTooltip: (s: TooltipState) => void;
  clearTooltip: () => void;
}

function BarChart({ spec, setTooltip, clearTooltip }: BarProps) {
  const { data } = spec;
  if (data.length === 0) return <text x={W / 2} y={H / 2} textAnchor="middle" fill="var(--text-muted)">No data</text>;

  const maxVal = niceMax(Math.max(...data.map(d => d.value)));
  const yScale = (v: number) => M.top + IH - (IH * v) / maxVal;
  const bandW = IW / data.length;
  const gap = bandW * 0.2;
  const rotate = data.length > 6;

  return (
    <g>
      <Axes maxVal={maxVal} xLabel={spec.xLabel} yLabel={spec.yLabel} />
      {spec.title && (
        <text x={W / 2} y={16} textAnchor="middle" fontSize={11}
          fill="var(--text)" fontFamily="var(--font-sans)" fontWeight={600}>
          {spec.title}
        </text>
      )}
      {data.map((d, i) => {
        const x = M.left + bandW * i + gap / 2;
        const bw = bandW - gap;
        const y = yScale(d.value);
        const bh = M.top + IH - y;
        const cx = x + bw / 2;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={bw} height={bh}
              fill={PALETTE[0]} fillOpacity={0.82} rx={2}
              style={{ cursor: "default", transition: "fill-opacity 0.1s" }}
              onMouseEnter={() => setTooltip({ visible: true, x: cx, y, label: d.label, value: d.value.toLocaleString() })}
              onMouseLeave={clearTooltip}
            />
            <text
              x={cx}
              y={M.top + IH + (rotate ? 6 : 12)}
              textAnchor={rotate ? "end" : "middle"}
              fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)"
              transform={rotate ? `rotate(-35, ${cx}, ${M.top + IH + 6})` : undefined}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ── line chart ─────────────────────────────────────────────────────────────────

interface LineProps {
  spec: Extract<ChartSpec, { type: "line" }>;
  setTooltip: (s: TooltipState) => void;
  clearTooltip: () => void;
}

function LineChart({ spec, setTooltip, clearTooltip }: LineProps) {
  const { data } = spec;
  if (data.length === 0) return <text x={W / 2} y={H / 2} textAnchor="middle" fill="var(--text-muted)">No data</text>;

  const maxVal = niceMax(Math.max(...data.map(d => d.value)));
  const yScale = (v: number) => M.top + IH - (IH * v) / maxVal;
  const xScale = (i: number) => data.length === 1 ? M.left + IW / 2 : M.left + (IW / (data.length - 1)) * i;
  const pts = data.map((d, i): [number, number] => [xScale(i), yScale(d.value)]);
  const ptsStr = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaD = pts.length >= 2
    ? `M ${pts[0][0]},${M.top + IH} L ${ptsStr} L ${pts[pts.length - 1][0]},${M.top + IH} Z`
    : "";

  return (
    <g>
      <Axes maxVal={maxVal} xLabel={spec.xLabel} yLabel={spec.yLabel} />
      {spec.title && (
        <text x={W / 2} y={16} textAnchor="middle" fontSize={11}
          fill="var(--text)" fontFamily="var(--font-sans)" fontWeight={600}>
          {spec.title}
        </text>
      )}
      {areaD && <path d={areaD} fill={PALETTE[0]} fillOpacity={0.08} />}
      {pts.length >= 2 && (
        <polyline points={ptsStr} fill="none" stroke={PALETTE[0]} strokeWidth={2} strokeLinejoin="round" />
      )}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill={PALETTE[0]}
          style={{ cursor: "default" }}
          onMouseEnter={() => setTooltip({ visible: true, x, y, label: data[i].label, value: data[i].value.toLocaleString() })}
          onMouseLeave={clearTooltip}
        />
      ))}
      {data.map((d, i) => (
        <text key={i} x={xScale(i)} y={M.top + IH + 12} textAnchor="middle"
          fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {d.label}
        </text>
      ))}
    </g>
  );
}

// ── pie chart ──────────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx},${cy} L ${s.x},${s.y} A ${r},${r} 0 ${large} 1 ${e.x},${e.y} Z`;
}

const PIE_H = 220;

interface PieProps {
  spec: Extract<ChartSpec, { type: "pie" }>;
  setTooltip: (s: TooltipState) => void;
  clearTooltip: () => void;
}

function PieChart({ spec, setTooltip, clearTooltip }: PieProps) {
  const { data } = spec;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0 || total === 0)
    return <text x={W / 2} y={PIE_H / 2} textAnchor="middle" fill="var(--text-muted)">No data</text>;

  const cx = W / 2;
  const cy = 110;
  const r = 82;
  let cursor = 0;
  const slices = data.map((d, i) => {
    const start = cursor;
    const sweep = (d.value / total) * 360;
    cursor += sweep;
    return { ...d, start, end: cursor, color: PALETTE[i % PALETTE.length] };
  });

  const LEGEND_COLS = 2;
  const legendRows = Math.ceil(data.length / LEGEND_COLS);
  const legendY = cy + r + 12;

  return (
    <g>
      {spec.title && (
        <text x={W / 2} y={16} textAnchor="middle" fontSize={11}
          fill="var(--text)" fontFamily="var(--font-sans)" fontWeight={600}>
          {spec.title}
        </text>
      )}
      {slices.map((s, i) => (
        <path key={i} d={arcPath(cx, cy, r, s.start, s.end)}
          fill={s.color} fillOpacity={0.85} stroke="var(--surface)" strokeWidth={1.5}
          style={{ cursor: "default" }}
          onMouseEnter={() => {
            const mid = (s.start + s.end) / 2;
            const pos = polarToCartesian(cx, cy, r * 0.65, mid);
            setTooltip({ visible: true, x: pos.x, y: pos.y, label: s.label, value: `${s.value.toLocaleString()} (${((s.value / total) * 100).toFixed(1)}%)` });
          }}
          onMouseLeave={clearTooltip}
        />
      ))}
      {/* legend */}
      {slices.map((s, i) => {
        const col = i % LEGEND_COLS;
        const row = Math.floor(i / LEGEND_COLS);
        const lx = M.left + col * (IW / LEGEND_COLS);
        const ly = legendY + row * 16;
        return (
          <g key={i}>
            <rect x={lx} y={ly - 7} width={8} height={8} fill={s.color} rx={1} />
            <text x={lx + 12} y={ly} fontSize={9} fill="var(--text-secondary)" fontFamily="var(--font-sans)">
              {s.label}
            </text>
          </g>
        );
      })}
      {/* invisible sizing rect so viewBox works */}
      <rect x={0} y={0} width={W} height={legendY + legendRows * 16 + 8} fill="none" />
    </g>
  );
}

// ── scatter chart ──────────────────────────────────────────────────────────────

interface ScatterProps {
  spec: Extract<ChartSpec, { type: "scatter" }>;
  setTooltip: (s: TooltipState) => void;
  clearTooltip: () => void;
}

function ScatterChart({ spec, setTooltip, clearTooltip }: ScatterProps) {
  const { data } = spec;
  if (data.length === 0) return <text x={W / 2} y={H / 2} textAnchor="middle" fill="var(--text-muted)">No data</text>;

  const xs = data.map(d => d.x);
  const ys = data.map(d => d.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const xScale = (v: number) => M.left + ((v - xMin) / xRange) * IW;
  const yScale = (v: number) => M.top + IH - ((v - yMin) / yRange) * IH;
  const maxVal = niceMax(yMax);

  return (
    <g>
      <Axes maxVal={maxVal} xLabel={spec.xLabel} yLabel={spec.yLabel} />
      {spec.title && (
        <text x={W / 2} y={16} textAnchor="middle" fontSize={11}
          fill="var(--text)" fontFamily="var(--font-sans)" fontWeight={600}>
          {spec.title}
        </text>
      )}
      {/* x gridlines */}
      {Array.from({ length: 5 }, (_, i) => {
        const x = M.left + (IW / 4) * i;
        return <line key={i} x1={x} y1={M.top} x2={x} y2={M.top + IH}
          stroke="var(--border)" strokeOpacity={0.4} strokeWidth={0.5} />;
      })}
      {data.map((d: XYPoint, i) => (
        <circle key={i} cx={xScale(d.x)} cy={yScale(d.y)} r={4}
          fill={PALETTE[0]} fillOpacity={0.7} stroke={PALETTE[0]} strokeWidth={0.5}
          style={{ cursor: "default" }}
          onMouseEnter={() => setTooltip({
            visible: true, x: xScale(d.x), y: yScale(d.y),
            label: d.label ?? `(${d.x}, ${d.y})`,
            value: `${d.x}, ${d.y}`,
          })}
          onMouseLeave={clearTooltip}
        />
      ))}
    </g>
  );
}

// ── ChartBlock (exported) ──────────────────────────────────────────────────────

export function ChartBlock({ spec }: { spec: ChartSpec }) {
  const [tooltip, setTooltip] = useState<TooltipState>(TOOLTIP_HIDDEN);
  const clearTooltip = () => setTooltip(TOOLTIP_HIDDEN);

  // Pie chart needs taller viewBox to fit legend
  const isPie = spec.type === "pie";
  const pieLegendRows = isPie ? Math.ceil(spec.data.length / 2) : 0;
  const viewH = isPie ? 110 + 82 + 12 + pieLegendRows * 16 + 16 : H;

  return (
    <div style={{
      margin: "1.2em 0",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)",
      padding: "var(--sp-3) var(--sp-2) var(--sp-2)",
      overflow: "hidden",
    }}>
      <svg
        viewBox={`0 0 ${W} ${viewH}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        aria-label={spec.title ?? `${spec.type} chart`}
      >
        {spec.type === "bar"     && <BarChart     spec={spec} setTooltip={setTooltip} clearTooltip={clearTooltip} />}
        {spec.type === "line"    && <LineChart    spec={spec} setTooltip={setTooltip} clearTooltip={clearTooltip} />}
        {spec.type === "pie"     && <PieChart     spec={spec} setTooltip={setTooltip} clearTooltip={clearTooltip} />}
        {spec.type === "scatter" && <ScatterChart spec={spec} setTooltip={setTooltip} clearTooltip={clearTooltip} />}
        {/* tooltip always rendered last so it's on top */}
        <Tooltip state={tooltip} />
      </svg>
    </div>
  );
}
