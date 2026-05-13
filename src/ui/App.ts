// All Preact + HTM components, grouped by panel (Recipe / Plot / Output).
// Each component reads only the signals it needs so re-renders stay surgical.
import htm from "htm";
import { Fragment, h } from "preact";

import { downloadTargetcurve, exportYaml, importYaml } from "../engine/bridge";
import {
  activeSlot,
  addTransform,
  appVisible,
  bypass,
  curveMenuOpen,
  curves,
  current,
  moveTransform,
  outputCfg,
  pickCurve,
  playing,
  pyReady,
  removeTransform,
  setParam,
  setStatus,
  setTransformParam,
  source,
  statusHidden,
  statusKind,
  statusText,
  transformMenuOpen,
  transformSchemas,
  updateOutput,
  uploadInfo,
  volume,
  type TransformInstance,
} from "../engine/state";
import {
  handleFile,
  setSourceValue,
  setVolumeValue,
  togglePlay,
  toggleBypass,
} from "./actions";
import { Icon } from "./icons";
import { CURVE_SHORT } from "./labels";
import { Sparkline } from "./sparklines";
import type { Renderable } from "./types";
import { BreakpointsTable, IconBtn, SliderRow } from "./widgets";

const html = htm.bind(h);

const shortLabel = (n: string): string => CURVE_SHORT[n] ?? n;

// ---------- Recipe panel ----------
const SlotToggle = (): Renderable => html`
  <div class="slot-toggle" role="tablist">
    ${(["A", "B"] as const).map((slot) => html`
      <button type="button"
              class=${`slot-btn ${activeSlot.value === slot ? "active" : ""}`}
              onClick=${() => (activeSlot.value = slot)}>${slot}</button>`)}
  </div>`;

const TransformCard = ({ inst, idx, total }: {
  inst: TransformInstance; idx: number; total: number;
}): Renderable => {
  const schema = transformSchemas.value.find((t) => t.name === inst.type);
  return html`<div class="transform-card">
    <div class="transform-header">
      <strong>${schema?.title ?? inst.type}</strong>
      <div class="transform-actions">
        <${IconBtn} label="↑" title="Move up" disabled=${idx === 0}
                    onClick=${() => { moveTransform(inst.id, -1); }}/>
        <${IconBtn} label="↓" title="Move down" disabled=${idx === total - 1}
                    onClick=${() => { moveTransform(inst.id, 1); }}/>
        <${IconBtn} label="×" title="Remove" variant="delete"
                    onClick=${() => { removeTransform(inst.id); }}/>
      </div>
    </div>
    ${schema !== undefined && html`<div class="controls-grid">
      ${schema.params.map((p) => html`<${SliderRow} key=${p.name} param=${p} values=${inst.params}
        onChange=${(v: number | string) => { setTransformParam(inst.id, p.name, v); }}/>`)}
    </div>`}
  </div>`;
};

const BaseCurveSelector = (): Renderable => {
  const r = current();
  const schema = curves.value.find((c) => c.name === r.curveName);
  return html`<div class="field-group">
    <div class="curve-trigger-wrap">
      <span class="eyebrow">Base curve</span>
      <button type="button" class="curve-trigger"
              aria-expanded=${curveMenuOpen.value ? "true" : "false"}
              onClick=${(e: Event) => { e.stopPropagation(); curveMenuOpen.value = !curveMenuOpen.value; }}>
        <${Sparkline} name=${r.curveName} class="trigger-spark"/>
        <span>${shortLabel(r.curveName)}</span>
        <${Icon} name="caret" class="trigger-caret"/>
      </button>
      ${curveMenuOpen.value && html`<div class="menu menu-curves" role="menu">
        ${curves.value.map((c) => html`
          <button type="button" key=${c.name}
                  class=${`menu-item ${c.name === r.curveName ? "active" : ""}`}
                  onClick=${() => { pickCurve(c.name); }}>
            <span class="menu-item-title">${shortLabel(c.name)}</span>
            <${Sparkline} name=${c.name} class="menu-item-spark"/>
          </button>`)}
      </div>`}
    </div>
    <p class="field-help">${schema?.description ?? ""}</p>
    <div class="controls-grid">
      ${(schema?.params ?? []).map((p) =>
        p.kind === "breakpoints"
          ? html`<${BreakpointsTable} key=${p.name} param=${p} values=${r.params}
              onChange=${(pts: [number, number][]) => { setParam(p.name, pts); }}/>`
          : html`<${SliderRow} key=${p.name} param=${p} values=${r.params}
              onChange=${(v: number | string) => { setParam(p.name, v); }}/>`)}
    </div>
  </div>`;
};

const TransformsSection = (): Renderable => {
  const r = current();
  return html`<div class="field-group">
    <div class="row-between">
      <span class="eyebrow">Transforms</span>
      <div class="add-transform-wrap">
        <button type="button" class="icon-btn add-btn"
                aria-expanded=${transformMenuOpen.value ? "true" : "false"}
                onClick=${(e: Event) => { e.stopPropagation(); transformMenuOpen.value = !transformMenuOpen.value; }}>
          <${Icon} name="plus"/>
        </button>
        ${transformMenuOpen.value && html`<div class="menu" role="menu">
          ${transformSchemas.value.map((t) => html`
            <button type="button" class="menu-item" role="menuitem" key=${t.name}
                    onClick=${() => { addTransform(t.name); }}>
              <span class="menu-item-title">${t.title}</span>
              <span class="menu-item-desc">${t.description}</span>
            </button>`)}
        </div>`}
      </div>
    </div>
    ${r.transforms.length === 0
      ? html`<p class="no-transforms">No transforms applied.</p>`
      : html`<div class="transforms-list">
          ${r.transforms.map((t, i) => html`
            <${TransformCard} key=${t.id} inst=${t} idx=${i} total=${r.transforms.length}/>`)}
        </div>`}
  </div>`;
};

const CitationSection = (): Renderable => {
  const r = current();
  const schema = curves.value.find((c) => c.name === r.curveName);
  return html`<details class="field-group citation-wrap">
    <summary class="citation-summary">
      <span class="eyebrow">Source</span>
      <span class="citation-hint">show citation</span>
    </summary>
    <p class="citation">${schema?.citation ?? ""}</p>
  </details>`;
};

const ifReady = (fn: () => void) => (): void => {
  if (!pyReady.value) {
    setStatus("Engine still loading — try again in a moment.", "loading");
    return;
  }
  fn();
};

const HeaderActions = (): Renderable => html`<div class="panel-header-actions">
  <button type="button" class="header-action" title="Import recipe from a .yml file"
          onClick=${ifReady(() => { (document.getElementById("yaml_upload") as HTMLInputElement).click(); })}>
    <${Icon} name="upload"/>
  </button>
  <button type="button" class="header-action" title="Export recipe as a .yml file"
          onClick=${ifReady(() => {
            try { exportYaml(); } catch (e) { setStatus(`Export failed: ${(e as Error).message}`, "error"); }
          })}>
    <${Icon} name="download"/>
  </button>
  <input id="yaml_upload" type="file" accept=".yml,.yaml,text/yaml" hidden
         onChange=${(e: Event) => {
           const f = (e.target as HTMLInputElement).files?.[0];
           if (f === undefined) return;
           f.text().then(importYaml).catch((err: Error) => {
             setStatus(`Couldn't import: ${err.message}`, "error");
           });
           (e.target as HTMLInputElement).value = "";
         }}/>
</div>`;

const RecipePanel = (): Renderable => html`<aside class="panel panel-recipe">
  <div class="panel-header">
    <div class="panel-header-left">
      <span class="panel-title">Recipe</span>
      <${SlotToggle}/>
    </div>
    <${HeaderActions}/>
  </div>
  <${BaseCurveSelector}/>
  <${TransformsSection}/>
  <${CitationSection}/>
</aside>`;

// ---------- Plot panel ----------
const PlotPanel = (): Renderable => html`<div class="plot-wrap">
  <div class="plot-toolbar">
    <span class="plot-shortcuts">
      <kbd>A</kbd><kbd>B</kbd> switch${"  "}
      <kbd>S</kbd> swap${"  "}
      <kbd>Space</kbd> bypass
    </span>
  </div>
  <svg id="plot" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet"></svg>
  ${!pyReady.value && html`<div class="engine-overlay">
    <div class="engine-overlay-inner">
      <div class="spinner"></div>
      <div>
        <p class="engine-title">Warming up the Python engine…</p>
        <p class="engine-sub">Configure the recipe meanwhile — the plot and audio light up in a few seconds.</p>
      </div>
    </div>
  </div>`}
</div>`;

// ---------- Output panel ----------
const Transport = (): Renderable => html`<div class="transport">
  <button type="button" class=${`btn-primary ${playing.value ? "playing" : ""}`}
          disabled=${!pyReady.value} onClick=${togglePlay}>
    <span class="play-icon">${playing.value ? "■" : "▶"}</span>
    <span>${playing.value ? "Stop" : "Play"}</span>
  </button>
  <button type="button" class="icon-toggle"
          aria-pressed=${bypass.value ? "true" : "false"}
          title="Bypass the EQ (hear the source unprocessed)"
          onClick=${toggleBypass}>
    <${Icon} name="power" size=${18}/>
  </button>
</div>`;

const SourceRow = (): Renderable => html`<${Fragment}>
  <label class="row-grid">
    <span>Source</span>
    <div class="segmented" role="radiogroup" aria-label="Audio source">
      ${(["pink", "sweep", "upload"] as const).map((v) => html`
        <button type="button" class=${`seg ${source.value === v ? "active" : ""}`}
                onClick=${() => { setSourceValue(v); }}>
          ${v === "pink" ? "Noise" : v === "sweep" ? "Sweep" : "File"}
        </button>`)}
    </div>
  </label>
  <input id="audio_upload" type="file" accept="audio/*" hidden
         onChange=${(e: Event) => {
           const f = (e.target as HTMLInputElement).files?.[0];
           if (f !== undefined) handleFile(f);
         }}/>
  ${uploadInfo.value !== null && html`<p class=${`upload-meta ${uploadInfo.value.error ? "error" : ""}`}>
    ${uploadInfo.value.name !== "" ? `${uploadInfo.value.name} · ` : ""}${uploadInfo.value.meta}
  </p>`}
<//>`;

const VolumeRow = (): Renderable => html`<div class="volume-row">
  <${Icon} name="volume" class="volume-icon" size=${16}/>
  <input type="range" class="cf-filled" min="0" max="1" step="0.01" value=${volume.value}
         style=${`--cf-fill: ${volume.value * 100}%`}
         onInput=${(e: Event) => { setVolumeValue(parseFloat((e.target as HTMLInputElement).value)); }}
         aria-label="Volume"/>
  <output>${Math.round(volume.value * 100)}%</output>
</div>`;

interface NumInputProps {
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

const numInput = ({ ariaLabel, value, min, max, onChange }: NumInputProps): Renderable =>
  html`<input type="number" value=${value} min=${min} max=${max} aria-label=${ariaLabel}
              onInput=${(e: Event) => { onChange(parseFloat((e.target as HTMLInputElement).value)); }}/>`;

const textInput = (id: string, value: string, onChange: (v: string) => void): Renderable => html`
  <input id=${id} type="text" value=${value}
         onInput=${(e: Event) => { onChange((e.target as HTMLInputElement).value); }}/>`;

const ExportSection = (): Renderable => {
  const o = outputCfg.value;
  return html`<section class="field-group">
    <label class="row-grid">
      <span>Name</span>
      ${textInput("export_name", o.name, (v) => { updateOutput("name", v); })}
    </label>
    <label class="row-grid">
      <span>Device</span>
      ${textInput("export_device", o.device, (v) => { updateOutput("device", v); })}
    </label>
    <div class="row-grid">
      <span>Range</span>
      <div class="range-row">
        ${numInput({
          ariaLabel: "Low frequency limit (Hz)",
          value: o.low, min: 1, max: 100,
          onChange: (v) => { updateOutput("low", v); },
        })}
        <span class="range-sep">to</span>
        ${numInput({
          ariaLabel: "High frequency limit (Hz)",
          value: o.high, min: 1000, max: 48000,
          onChange: (v) => { updateOutput("high", v); },
        })}
        <span class="range-unit">Hz</span>
      </div>
    </div>
    <button type="button" class="btn-primary download-btn" disabled=${!pyReady.value}
            onClick=${downloadTargetcurve}>
      <${Icon} name="download" size=${16}/> Download .targetcurve
    </button>
  </section>`;
};

const OutputPanel = (): Renderable => html`<aside class="panel panel-output">
  <div class="panel-header"><span class="panel-title">Output</span></div>
  <section class="field-group">
    <${Transport}/>
    <${SourceRow}/>
    <${VolumeRow}/>
  </section>
  <${ExportSection}/>
</aside>`;

// ---------- Top-level shell ----------
const StatusChip = (): Renderable => html`
  <section id="status" class=${statusHidden.value ? "hidden" : ""}>
    <span class="status-dot" data-state=${statusKind.value}></span>
    <span>${statusText.value}</span>
  </section>`;

const Header = (): Renderable => html`<header>
  <h1>curveforge</h1>
  <p class="tagline">
    Design Dirac Live target curves in the browser.
    <a href="https://pypi.org/project/curveforge/" target="_blank">curveforge</a> via Pyodide.
  </p>
</header>`;

export const App = (): Renderable => html`<${Fragment}>
  <${StatusChip}/>
  <main>
    <${Header}/>
    ${appVisible.value && html`<section id="app">
      <${RecipePanel}/>
      <${PlotPanel}/>
      <${OutputPanel}/>
    </section>`}
  </main>
<//>`;
