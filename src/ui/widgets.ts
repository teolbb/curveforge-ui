// Reusable widget components shared by recipe slots and the breakpoints
// editor. Values flow in via props — no global signal subscriptions.
import htm from "htm";
import { h } from "preact";

import type { ParamSchema, ParamValue } from "../engine/state";
import { formatValue, paramLabel, titleCase } from "./labels";
import type { Renderable } from "./types";

const html = htm.bind(h);

interface IconBtnProps {
  label: string;
  title: string;
  variant?: "default" | "delete";
  disabled?: boolean;
  onClick: () => void;
}

export const IconBtn = ({
  label,
  title,
  variant = "default",
  disabled = false,
  onClick,
}: IconBtnProps): Renderable =>
  html`<button type="button" class=${`icon-btn ${variant === "delete" ? "delete" : ""}`}
               title=${title} disabled=${disabled} onClick=${onClick}>${label}</button>`;

interface SliderRowProps {
  param: ParamSchema;
  values: Record<string, ParamValue>;
  onChange: (v: number | string) => void;
}

export const SliderRow = ({ param, values, onChange }: SliderRowProps): Renderable => {
  const cur = values[param.name] ?? param.default;
  const label = html`<label title=${param.description}>${paramLabel(param.name)}</label>`;
  if (param.kind === "enum") {
    return html`<div class="slider-row">
      ${label}
      <div class="segmented" role="radiogroup">
        ${(param.enumValues ?? []).map((ev) => html`
          <button type="button" class=${`seg ${ev === cur ? "active" : ""}`}
                  onClick=${() => { onChange(ev); }}>${titleCase(ev)}</button>`)}
      </div>
      <span></span>
    </div>`;
  }
  const min = param.min ?? 0;
  const max = param.max ?? 1;
  const val = typeof cur === "number" ? cur : (param.default as number);
  const fill = max > min ? ((val - min) / (max - min)) * 100 : 0;
  return html`<div class="slider-row">
    ${label}
    <input type="range" class="cf-filled"
           min=${min} max=${max} step=${param.step ?? 1} value=${val}
           style=${`--cf-fill: ${fill}%`}
           onInput=${(e: Event) => { onChange(parseFloat((e.target as HTMLInputElement).value)); }}/>
    <output>${formatValue(param.name, val, param.kind)}</output>
  </div>`;
};

interface BreakpointsTableProps {
  param: ParamSchema;
  values: Record<string, ParamValue>;
  onChange: (pts: [number, number][]) => void;
}

export const BreakpointsTable = ({ param, values, onChange }: BreakpointsTableProps): Renderable => {
  const points = (values[param.name] ?? param.default) as [number, number][];
  const Num = ({ value, step, onChangeNum }: {
    value: number; step: string; onChangeNum: (v: number) => void;
  }): Renderable => html`<input type="number" class="bp-input" value=${value} step=${step}
    onChange=${(e: Event) => { onChangeNum(parseFloat((e.target as HTMLInputElement).value)); }}/>`;
  const updateAt = (idx: number, mut: (p: [number, number]) => [number, number]): void => {
    const next = points.map(([f, g]) => [f, g] as [number, number]);
    const at = next[idx];
    if (at === undefined) return;
    next[idx] = mut(at);
    next.sort((a, b) => a[0] - b[0]);
    onChange(next);
  };
  return html`<div class="breakpoints-table">
    <div class="bp-header">
      <span class="bp-col">Hz</span><span class="bp-col">dB</span><span></span>
    </div>
    ${points.map(([f, g], idx) => html`
      <div class="bp-row" key=${idx}>
        <${Num} value=${f} step="1" onChangeNum=${(v: number) => { updateAt(idx, (p) => [v, p[1]]); }}/>
        <${Num} value=${g} step="0.1" onChangeNum=${(v: number) => { updateAt(idx, (p) => [p[0], v]); }}/>
        <button type="button" class="icon-btn delete" title="Remove point"
                disabled=${points.length <= 2}
                onClick=${() => { onChange(points.filter((_, i) => i !== idx)); }}>×</button>
      </div>`)}
    <button type="button" class="bp-add"
            onClick=${() => {
              const last = points[points.length - 1] ?? [1000, 0];
              const prev = points[points.length - 2] ?? [100, 0];
              onChange([...points, [Math.round(Math.sqrt(prev[0] * last[0])), 0]]);
            }}>+ Add point</button>
  </div>`;
};
