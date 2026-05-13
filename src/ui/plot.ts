interface Curve {
  freqs: number[];
  gains_db: number[];
}

export interface PlottedCurve {
  curve: Curve;
  color: string;
  label: string;
  emphasized: boolean;
}

const PLOT_W = 1600;
const PLOT_H = 900;
const MARGIN = { top: 40, right: 40, bottom: 70, left: 80 };
const INNER_W = PLOT_W - MARGIN.left - MARGIN.right;
const INNER_H = PLOT_H - MARGIN.top - MARGIN.bottom;

const FONT_TICK = 22;
const FONT_AXIS = 24;
const FONT_LEGEND = 26;

const F_MIN = 20;
const F_MAX = 20000;
const DB_MIN = -12;
const DB_MAX = 18;

const NS = "http://www.w3.org/2000/svg";
const LOG_F_MIN = Math.log10(F_MIN);
const LOG_F_MAX = Math.log10(F_MAX);

const CURVE_CLIP_ID = "cf-curve-clip";

export function renderPlot(
  svgId: string,
  curves: Curve | PlottedCurve[],
): void {
  const el = document.getElementById(svgId);
  if (!(el instanceof SVGSVGElement)) return;
  const svg = el;
  while (svg.firstChild !== null) svg.removeChild(svg.firstChild);
  svg.setAttribute("viewBox", `0 0 ${PLOT_W} ${PLOT_H}`);

  const plotted: PlottedCurve[] = Array.isArray(curves)
    ? curves
    : [{ curve: curves, color: "var(--curve)", label: "", emphasized: true }];

  appendClipPath(svg);
  appendGridX(svg);
  appendGridY(svg);
  // Draw non-emphasized first so emphasized lands on top.
  for (const p of plotted.filter((p) => !p.emphasized)) appendCurve(svg, p);
  for (const p of plotted.filter((p) => p.emphasized)) appendCurve(svg, p);
  appendAxisLabels(svg);
  if (plotted.some((p) => p.label !== "")) appendLegend(svg, plotted);
}

/** Clip-path that keeps the curve inside the plot frame, even when the source
 * grid extends below the displayed F_MIN (the 10 Hz, 12.5 Hz, 16 Hz points
 * from a third_octave grid would otherwise overflow to the left). */
function appendClipPath(svg: SVGSVGElement): void {
  const defs = document.createElementNS(NS, "defs");
  const clip = document.createElementNS(NS, "clipPath");
  clip.setAttribute("id", CURVE_CLIP_ID);
  const rect = document.createElementNS(NS, "rect");
  rect.setAttribute("x", String(MARGIN.left));
  rect.setAttribute("y", String(MARGIN.top));
  rect.setAttribute("width", String(INNER_W));
  rect.setAttribute("height", String(INNER_H));
  clip.appendChild(rect);
  defs.appendChild(clip);
  svg.appendChild(defs);
}

function appendGridX(svg: SVGSVGElement): void {
  const ticks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const labelled = new Set([20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]);
  for (const f of ticks) {
    const x = xPos(f);
    svg.appendChild(
      mkLine({ x1: x, y1: MARGIN.top, x2: x, y2: MARGIN.top + INNER_H, kind: "grid" }),
    );
    if (labelled.has(f)) {
      const txt = mkText(
        x,
        MARGIN.top + INNER_H + FONT_TICK + 8,
        formatHz(f),
        FONT_TICK,
      );
      txt.setAttribute("text-anchor", "middle");
      svg.appendChild(txt);
    }
  }
}

function appendGridY(svg: SVGSVGElement): void {
  for (let db = DB_MIN; db <= DB_MAX; db += 2) {
    const y = yPos(db);
    const isMajor = db % 4 === 0;
    const isZero = db === 0;
    const kind: GridKind = isZero ? "zero" : isMajor ? "grid-major" : "grid";
    svg.appendChild(
      mkLine({ x1: MARGIN.left, y1: y, x2: MARGIN.left + INNER_W, y2: y, kind }),
    );
    if (isMajor) {
      const txt = mkText(MARGIN.left - 12, y + 8, `${db}`, FONT_TICK);
      txt.setAttribute("text-anchor", "end");
      svg.appendChild(txt);
    }
  }
}

function appendCurve(svg: SVGSVGElement, p: PlottedCurve): void {
  const d = p.curve.freqs
    .map((f, i) => {
      const g = p.curve.gains_db[i] ?? 0;
      return `${i === 0 ? "M" : "L"}${xPos(f).toFixed(2)},${yPos(g).toFixed(2)}`;
    })
    .join(" ");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("clip-path", `url(#${CURVE_CLIP_ID})`);
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", p.color);
  path.setAttribute("stroke-width", p.emphasized ? "7" : "4");
  path.setAttribute("stroke-opacity", p.emphasized ? "1" : "0.55");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");
  if (!p.emphasized) path.setAttribute("stroke-dasharray", "14,9");
  svg.appendChild(path);
}

function appendAxisLabels(svg: SVGSVGElement): void {
  const xLabel = mkText(
    MARGIN.left + INNER_W / 2,
    PLOT_H - 12,
    "Frequency (Hz)",
    FONT_AXIS,
  );
  xLabel.setAttribute("text-anchor", "middle");
  xLabel.setAttribute("fill-opacity", "0.55");
  svg.appendChild(xLabel);

  const yLabelX = 28;
  const yLabelY = MARGIN.top + INNER_H / 2;
  const yLabel = mkText(yLabelX, yLabelY, "dB", FONT_AXIS);
  yLabel.setAttribute("text-anchor", "middle");
  yLabel.setAttribute("fill-opacity", "0.55");
  yLabel.setAttribute("transform", `rotate(-90 ${yLabelX} ${yLabelY})`);
  svg.appendChild(yLabel);
}

function appendLegend(svg: SVGSVGElement, plotted: PlottedCurve[]): void {
  const x0 = MARGIN.left + 24;
  const y0 = MARGIN.top + 36;
  const rowH = FONT_LEGEND + 12;
  plotted.forEach((p, i) => {
    const y = y0 + i * rowH;
    const swatch = document.createElementNS(NS, "line");
    swatch.setAttribute("x1", `${x0}`);
    swatch.setAttribute("y1", `${y}`);
    swatch.setAttribute("x2", `${x0 + 44}`);
    swatch.setAttribute("y2", `${y}`);
    swatch.setAttribute("stroke", p.color);
    swatch.setAttribute("stroke-width", p.emphasized ? "5" : "3");
    swatch.setAttribute("stroke-opacity", p.emphasized ? "1" : "0.55");
    swatch.setAttribute("stroke-linecap", "round");
    if (!p.emphasized) swatch.setAttribute("stroke-dasharray", "12,8");
    svg.appendChild(swatch);
    const txt = mkText(x0 + 56, y + 9, p.label, FONT_LEGEND);
    txt.setAttribute("font-weight", p.emphasized ? "600" : "400");
    txt.setAttribute("fill-opacity", p.emphasized ? "0.92" : "0.6");
    svg.appendChild(txt);
  });
}

function xPos(f: number): number {
  const t = (Math.log10(f) - LOG_F_MIN) / (LOG_F_MAX - LOG_F_MIN);
  return MARGIN.left + t * INNER_W;
}

function yPos(db: number): number {
  const t = (db - DB_MIN) / (DB_MAX - DB_MIN);
  return MARGIN.top + (1 - t) * INNER_H;
}

function formatHz(f: number): string {
  if (f >= 1000) return `${f / 1000}k`;
  return `${f}`;
}

type GridKind = "grid" | "grid-major" | "zero";

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: GridKind;
}

function mkLine({ x1, y1, x2, y2, kind }: Segment): SVGLineElement {
  const l = document.createElementNS(NS, "line");
  l.setAttribute("x1", `${x1}`);
  l.setAttribute("y1", `${y1}`);
  l.setAttribute("x2", `${x2}`);
  l.setAttribute("y2", `${y2}`);
  l.setAttribute("stroke", "currentColor");
  const opacity = kind === "zero" ? "0.55" : kind === "grid-major" ? "0.22" : "0.1";
  l.setAttribute("stroke-opacity", opacity);
  l.setAttribute("stroke-width", kind === "zero" ? "2" : "1.25");
  if (kind === "zero") l.setAttribute("stroke-dasharray", "10,8");
  return l;
}

const UI_FONT =
  '-apple-system, "Helvetica Neue", system-ui, sans-serif';

function mkText(x: number, y: number, text: string, size = 22): SVGTextElement {
  const t = document.createElementNS(NS, "text");
  t.setAttribute("x", `${x}`);
  t.setAttribute("y", `${y}`);
  t.setAttribute("fill", "currentColor");
  t.setAttribute("font-size", String(size));
  t.setAttribute("font-family", UI_FONT);
  t.setAttribute("font-weight", "600");
  t.setAttribute("fill-opacity", "0.75");
  t.textContent = text;
  return t;
}
