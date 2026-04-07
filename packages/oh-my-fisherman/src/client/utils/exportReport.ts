import { marked } from "marked";
import type { Token } from "marked";
import type { ChartSpec } from "../../shared/chart-types.js";

// ── theme ──────────────────────────────────────────────────────────────────────

interface Theme {
  bg: string; surface: string; surfaceRaised: string;
  border: string; borderActive: string;
  text: string; textSecondary: string; textMuted: string;
  accent: string;
}

function readTheme(): Theme {
  const g = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return {
    bg:           g("--bg"),
    surface:      g("--surface"),
    surfaceRaised:g("--surface-raised"),
    border:       g("--border"),
    borderActive: g("--border-active"),
    text:         g("--text"),
    textSecondary:g("--text-secondary"),
    textMuted:    g("--text-muted"),
    accent:       g("--accent"),
  };
}

// ── SVG chart generation (static, no interactivity) ───────────────────────────

const SW = 480, SH = 260;
const SM = { top: 28, right: 16, bottom: 48, left: 52 };
const SIW = SW - SM.left - SM.right;
const SIH = SH - SM.top - SM.bottom;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapSvg(inner: string, w: number, h: number): string {
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

function noDataSvg(t: Theme, h: number): string {
  return wrapSvg(`<text x="${SW / 2}" y="${h / 2}" text-anchor="middle" fill="${t.textMuted}" font-size="12" font-family="sans-serif">No data</text>`, SW, h);
}

function axes(t: Theme, maxVal: number, xLabel?: string, yLabel?: string): string {
  let out = "";
  for (let i = 0; i <= 5; i++) {
    const v = (maxVal / 5) * i;
    const y = SM.top + SIH - (SIH * i) / 5;
    const label = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(v < 10 ? 1 : 0);
    out += `<line x1="${SM.left}" y1="${y}" x2="${SM.left + SIW}" y2="${y}" stroke="${t.border}" stroke-width="0.5" opacity="0.5"/>`;
    out += `<text x="${SM.left - 4}" y="${y + 3.5}" text-anchor="end" font-size="9" fill="${t.textMuted}" font-family="monospace">${label}</text>`;
  }
  out += `<line x1="${SM.left}" y1="${SM.top}" x2="${SM.left}" y2="${SM.top + SIH}" stroke="${t.borderActive}" stroke-width="1"/>`;
  out += `<line x1="${SM.left}" y1="${SM.top + SIH}" x2="${SM.left + SIW}" y2="${SM.top + SIH}" stroke="${t.borderActive}" stroke-width="1"/>`;
  if (xLabel) out += `<text x="${SM.left + SIW / 2}" y="${SH - 4}" text-anchor="middle" font-size="10" fill="${t.textSecondary}" font-family="sans-serif">${esc(xLabel)}</text>`;
  if (yLabel) out += `<text x="10" y="${SM.top + SIH / 2}" text-anchor="middle" font-size="10" fill="${t.textSecondary}" font-family="sans-serif" transform="rotate(-90,10,${SM.top + SIH / 2})">${esc(yLabel)}</text>`;
  return out;
}

function chartTitle(t: Theme, title?: string): string {
  return title ? `<text x="${SW / 2}" y="16" text-anchor="middle" font-size="11" fill="${t.text}" font-family="sans-serif" font-weight="600">${esc(title)}</text>` : "";
}

function barSvg(spec: Extract<ChartSpec, { type: "bar" }>, t: Theme): string {
  const { data } = spec;
  if (!data.length) return noDataSvg(t, SH);
  const maxVal = niceMax(Math.max(...data.map(d => d.value)));
  const yScale = (v: number) => SM.top + SIH - (SIH * v) / maxVal;
  const bandW = SIW / data.length;
  const gap = bandW * 0.2;
  const rotate = data.length > 6;
  let out = axes(t, maxVal, spec.xLabel, spec.yLabel) + chartTitle(t, spec.title);
  data.forEach((d, i) => {
    const x = SM.left + bandW * i + gap / 2;
    const bw = bandW - gap;
    const y = yScale(d.value);
    const cx = x + bw / 2;
    const ly = SM.top + SIH + (rotate ? 6 : 12);
    const transform = rotate ? ` transform="rotate(-35,${cx},${ly})"` : "";
    out += `<rect x="${x}" y="${y}" width="${bw}" height="${SM.top + SIH - y}" fill="${t.accent}" fill-opacity="0.82" rx="2"/>`;
    out += `<text x="${cx}" y="${ly}" text-anchor="${rotate ? "end" : "middle"}" font-size="9" fill="${t.textMuted}" font-family="monospace"${transform}>${esc(d.label)}</text>`;
  });
  return wrapSvg(out, SW, SH);
}

function lineSvg(spec: Extract<ChartSpec, { type: "line" }>, t: Theme): string {
  const { data } = spec;
  if (!data.length) return noDataSvg(t, SH);
  const maxVal = niceMax(Math.max(...data.map(d => d.value)));
  const yScale = (v: number) => SM.top + SIH - (SIH * v) / maxVal;
  const xScale = (i: number) => data.length === 1 ? SM.left + SIW / 2 : SM.left + (SIW / (data.length - 1)) * i;
  const pts = data.map((d, i): [number, number] => [xScale(i), yScale(d.value)]);
  const ptsStr = pts.map(([x, y]) => `${x},${y}`).join(" ");
  let out = axes(t, maxVal, spec.xLabel, spec.yLabel) + chartTitle(t, spec.title);
  if (pts.length >= 2) {
    const areaD = `M ${pts[0][0]},${SM.top + SIH} L ${ptsStr} L ${pts[pts.length - 1][0]},${SM.top + SIH} Z`;
    out += `<path d="${areaD}" fill="${t.accent}" fill-opacity="0.08"/>`;
    out += `<polyline points="${ptsStr}" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linejoin="round"/>`;
  }
  pts.forEach(([x, y], i) => {
    out += `<circle cx="${x}" cy="${y}" r="3.5" fill="${t.accent}"/>`;
    out += `<text x="${x}" y="${SM.top + SIH + 12}" text-anchor="middle" font-size="9" fill="${t.textMuted}" font-family="monospace">${esc(data[i].label)}</text>`;
  });
  return wrapSvg(out, SW, SH);
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSvg(spec: Extract<ChartSpec, { type: "pie" }>, t: Theme): string {
  const { data } = spec;
  const PALETTE = [t.accent, "#6a8fa7", "#7a9a6e", "#c49b5c", "#8e6aa8", "#b86a6a"];
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length || !total) return noDataSvg(t, 220);
  const cx = SW / 2, cy = 110, r = 82;
  const LEGEND_COLS = 2;
  const legendRows = Math.ceil(data.length / LEGEND_COLS);
  const legendY = cy + r + 12;
  const viewH = legendY + legendRows * 16 + 16;
  let cursor = 0;
  let out = chartTitle(t, spec.title);
  data.forEach((d, i) => {
    const start = cursor;
    const sweep = (d.value / total) * 360;
    cursor += sweep;
    const s = polar(cx, cy, r, start), e = polar(cx, cy, r, cursor);
    const large = sweep > 180 ? 1 : 0;
    const color = PALETTE[i % PALETTE.length];
    out += `<path d="M ${cx},${cy} L ${s.x},${s.y} A ${r},${r} 0 ${large} 1 ${e.x},${e.y} Z" fill="${color}" fill-opacity="0.85" stroke="${t.surface}" stroke-width="1.5"/>`;
    const col = i % LEGEND_COLS, row = Math.floor(i / LEGEND_COLS);
    const lx = SM.left + col * (SIW / LEGEND_COLS), ly = legendY + row * 16;
    out += `<rect x="${lx}" y="${ly - 7}" width="8" height="8" fill="${color}" rx="1"/>`;
    out += `<text x="${lx + 12}" y="${ly}" font-size="9" fill="${t.textSecondary}" font-family="sans-serif">${esc(d.label)}</text>`;
  });
  return wrapSvg(out, SW, viewH);
}

function scatterSvg(spec: Extract<ChartSpec, { type: "scatter" }>, t: Theme): string {
  const { data } = spec;
  if (!data.length) return noDataSvg(t, SH);
  const xs = data.map(d => d.x), ys = data.map(d => d.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1, yRange = yMax - yMin || 1;
  const xScale = (v: number) => SM.left + ((v - xMin) / xRange) * SIW;
  const yScale = (v: number) => SM.top + SIH - ((v - yMin) / yRange) * SIH;
  let out = axes(t, niceMax(yMax), spec.xLabel, spec.yLabel) + chartTitle(t, spec.title);
  data.forEach(d => {
    out += `<circle cx="${xScale(d.x)}" cy="${yScale(d.y)}" r="4" fill="${t.accent}" fill-opacity="0.7" stroke="${t.accent}" stroke-width="0.5"/>`;
  });
  return wrapSvg(out, SW, SH);
}

function specToSvg(spec: ChartSpec, t: Theme): string {
  switch (spec.type) {
    case "bar":     return barSvg(spec, t);
    case "line":    return lineSvg(spec, t);
    case "pie":     return pieSvg(spec, t);
    case "scatter": return scatterSvg(spec, t);
  }
}

// ── markdown → body HTML (with chart blocks converted to inline SVG) ───────────

function markdownToBodyHtml(markdown: string, t: Theme): string {
  const tokens = marked.Lexer.lex(markdown);
  let html = "";
  let acc: Token[] = [];

  const flush = () => {
    if (!acc.length) return;
    html += marked.Parser.parse(acc as marked.TokensList);
    acc = [];
  };

  for (const token of tokens) {
    if (token.type === "code" && (token as marked.Tokens.Code).lang === "fisherman-chart") {
      flush();
      try {
        const spec = JSON.parse((token as marked.Tokens.Code).text) as ChartSpec;
        html += `<div class="chart-block">${specToSvg(spec, t)}</div>`;
      } catch {
        acc.push(token);
      }
    } else {
      acc.push(token);
    }
  }
  flush();
  return html;
}

// ── HTML document builder ──────────────────────────────────────────────────────

function buildHtmlDoc(bodyHtml: string, title: string, t: Theme): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Inter",-apple-system,"Segoe UI",sans-serif;background:${t.bg};color:${t.text};max-width:800px;margin:0 auto;padding:48px 40px;line-height:1.75;font-size:14px}
h1{font-family:"Instrument Serif",Georgia,serif;font-size:2rem;font-weight:400;color:${t.text};margin:0 0 32px;line-height:1.2}
h2{font-size:1.1rem;font-weight:600;color:${t.text};margin:36px 0 12px;border-bottom:1px solid ${t.border};padding-bottom:6px}
h3{font-size:.95rem;font-weight:600;color:${t.text};margin:24px 0 8px}
p{margin:0 0 14px}
a{color:${t.accent};text-decoration:underline;text-underline-offset:2px}
ul,ol{margin:0 0 14px;padding-left:24px}
li{margin-bottom:4px}
blockquote{margin:16px 0;padding:10px 16px;border-left:3px solid ${t.accent};background:${t.surface};color:${t.textSecondary};border-radius:0 4px 4px 0}
code{font-family:"JetBrains Mono","SF Mono",Consolas,monospace;font-size:.8em;background:${t.surfaceRaised};padding:1px 5px;border-radius:3px;color:${t.accent}}
pre{background:${t.surfaceRaised};border:1px solid ${t.border};border-radius:6px;padding:14px 16px;overflow-x:auto;margin:0 0 16px}
pre code{background:none;padding:0;color:${t.text}}
table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:.85em}
th{background:${t.surface};color:${t.textSecondary};font-weight:600;text-align:left;padding:8px 12px;border-bottom:2px solid ${t.border}}
td{padding:7px 12px;border-bottom:1px solid ${t.border};color:${t.text}}
tr:last-child td{border-bottom:none}
hr{border:none;border-top:1px solid ${t.border};margin:24px 0}
.chart-block{margin:20px 0;background:${t.surface};border:1px solid ${t.border};border-radius:6px;padding:16px 12px 12px;overflow:hidden}
@media print{body{padding:0;max-width:100%}.chart-block{break-inside:avoid}h2{break-after:avoid}}
</style>
</head>
<body>
<h1>${esc(title)}</h1>
${bodyHtml}
</body>
</html>`;
}

// ── download helper ────────────────────────────────────────────────────────────

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
}

// ── public API ─────────────────────────────────────────────────────────────────

export function exportMarkdown(markdown: string, notebookName: string) {
  download(markdown, `${slugify(notebookName)}.md`, "text/markdown;charset=utf-8");
}

export function exportHtml(markdown: string, notebookName: string) {
  const t = readTheme();
  const body = markdownToBodyHtml(markdown, t);
  download(buildHtmlDoc(body, notebookName, t), `${slugify(notebookName)}.html`, "text/html;charset=utf-8");
}

export function exportPdf(markdown: string, notebookName: string) {
  const t = readTheme();
  const body = markdownToBodyHtml(markdown, t);
  const doc = buildHtmlDoc(body, notebookName, t);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
  win.addEventListener("load", () => { win.focus(); win.print(); });
}
