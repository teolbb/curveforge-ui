// Stylised one-line path for each curve, drawn into a small SVG for previews.
import htm from "htm";
import { h, type VNode } from "preact";

const html = htm.bind(h);

interface SparklineProps {
  name: string;
  class?: string;
}

const W = 80;
const H = 28;
const TOP = 3;
const BOT = H - 3;
const MID = H / 2;
const X0 = 2;
const X1 = W - 2;

function path(name: string): string {
  if (name === "flat") return `M${X0},${MID} L${X1},${MID}`;
  if (name === "breakpoints") {
    return `M${X0},${MID} L${W * 0.22},${TOP + 1} L${W * 0.45},${MID - 0.5} L${W * 0.72},${BOT - 1} L${X1},${MID - 1}`;
  }
  if (name === "harman") {
    const kx = W * 0.38;
    return `M${X0},${TOP} L${W * 0.18},${TOP} C${W * 0.3},${TOP} ${kx - 2},${MID} ${kx},${MID} L${X1},${MID}`;
  }
  if (name === "welti_sub") {
    const kx = W * 0.22;
    return `M${X0},${TOP} L${W * 0.1},${TOP} C${W * 0.16},${TOP} ${kx - 2},${MID} ${kx},${MID} L${X1},${MID}`;
  }
  if (name === "olive_welti_inroom" || name === "b_and_k") {
    const kx = W * 0.35;
    return `M${X0},${TOP} L${W * 0.16},${TOP} C${W * 0.26},${TOP} ${kx - 2},${MID - 1} ${kx},${MID} L${X1},${BOT}`;
  }
  if (name === "toole_inroom") return `M${X0},${MID - 2} L${X1},${BOT - 1}`;
  return `M${X0},${MID} L${X1},${MID}`;
}

export const Sparkline = ({ name, class: cls = "" }: SparklineProps): VNode => html`<svg
  viewBox="0 0 ${W} ${H}" class=${`curve-sparkline ${cls}`.trim()} aria-hidden="true">
  <path d=${path(name)} fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>` as VNode;
