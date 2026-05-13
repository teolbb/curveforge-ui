import { effect, signal, type Signal } from "@preact/signals";

import type { SourceName } from "./audio";

export type ParamKind = "number" | "integer" | "enum" | "breakpoints";
export type ParamValue = number | string | [number, number][];
export type Slot = "A" | "B";

export interface ParamSchema {
  name: string;
  kind: ParamKind;
  min?: number;
  max?: number;
  default: ParamValue;
  step?: number;
  enumValues?: string[];
  description: string;
}
export interface CurveSchema {
  name: string;
  title: string;
  description: string;
  citation: string;
  params: ParamSchema[];
}
export interface TransformSchema {
  name: string;
  title: string;
  description: string;
  params: ParamSchema[];
}
export interface TransformInstance {
  id: string;
  type: string;
  params: Record<string, number | string>;
}
export interface Curve {
  freqs: number[];
  gains_db: number[];
}
export interface Recipe {
  curveName: string;
  params: Record<string, ParamValue>;
  transforms: TransformInstance[];
}
export interface OutputConfig {
  name: string;
  device: string;
  low: number;
  high: number;
}

const STORAGE_KEY = "curveforge-ui-state-v1";

export const curves = signal<CurveSchema[]>([]);
export const transformSchemas = signal<TransformSchema[]>([]);
export const activeSlot = signal<Slot>("A");
export const recipeA = signal<Recipe>({ curveName: "", params: {}, transforms: [] });
export const recipeB = signal<Recipe>({ curveName: "", params: {}, transforms: [] });
export const outputCfg = signal<OutputConfig>({
  name: "my-curve",
  device: "Generic",
  low: 10,
  high: 24000,
});
export const statusText = signal("Loading…");
export const statusKind = signal<"loading" | "ready" | "error">("loading");
export const statusHidden = signal(true);
export const pyReady = signal(false);
export const appVisible = signal(false);
export const playing = signal(false);
export const source = signal<SourceName>("pink");
export const bypass = signal(false);
export const volume = signal(0.4);
export const uploadInfo = signal<{ name: string; meta: string; error: boolean } | null>(null);
export const curveMenuOpen = signal(false);
export const transformMenuOpen = signal(false);

const currentSig = (): Signal<Recipe> =>
  activeSlot.value === "A" ? recipeA : recipeB;
export const current = (): Recipe => currentSig().value;
export const setCurrent = (r: Recipe): void => {
  currentSig().value = r;
};

export function cloneDefault(v: ParamValue): ParamValue {
  return Array.isArray(v) ? v.map(([f, g]) => [f, g] as [number, number]) : v;
}

export function freshRecipe(curveName: string): Recipe {
  const schema = curves.value.find((c) => c.name === curveName);
  const params: Record<string, ParamValue> = {};
  if (schema !== undefined) {
    for (const p of schema.params) params[p.name] = cloneDefault(p.default);
  }
  return { curveName, params, transforms: [] };
}

export function setStatus(text: string, kind: "loading" | "ready" | "error"): void {
  statusText.value = text;
  statusKind.value = kind;
  statusHidden.value = false;
  if (kind === "ready") setTimeout(() => (statusHidden.value = true), 1800);
}

// Auto-save to localStorage on any state change.
let saveTimer: number | null = null;
effect(() => {
  void activeSlot.value;
  void recipeA.value;
  void recipeB.value;
  void outputCfg.value;
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          activeSlot: activeSlot.value,
          recipes: { A: recipeA.value, B: recipeB.value },
          output: outputCfg.value,
        }),
      );
    } catch {
      /* quota or disabled */
    }
  }, 200);
});

/** Shape of the localStorage payload. v1; future migrations bump the version. */
interface StoredStateV1 {
  readonly version: 1;
  readonly activeSlot: Slot;
  readonly recipes: { readonly A: Recipe; readonly B: Recipe };
  readonly output: OutputConfig;
}

function isStoredStateV1(value: unknown): value is StoredStateV1 {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v["version"] !== 1) return false;
  if (v["activeSlot"] !== "A" && v["activeSlot"] !== "B") return false;
  const recipes = v["recipes"];
  if (typeof recipes !== "object" || recipes === null) return false;
  const r = recipes as Record<string, unknown>;
  if (typeof r["A"] !== "object" || typeof r["B"] !== "object") return false;
  if (typeof v["output"] !== "object" || v["output"] === null) return false;
  return true;
}

/** Parse + validate; returns null on any structural mismatch (silent fallback to defaults). */
function parseStored(raw: string): StoredStateV1 | null {
  try {
    const data: unknown = JSON.parse(raw);
    return isStoredStateV1(data) ? data : null;
  } catch {
    return null;
  }
}

/** Apply a parsed payload to the live signals — only fields with valid curve refs. */
function applyStored(s: StoredStateV1): void {
  activeSlot.value = s.activeSlot;
  const knownCurves = curves.value;
  if (knownCurves.some((c) => c.name === s.recipes.A.curveName)) {
    recipeA.value = s.recipes.A;
  }
  if (knownCurves.some((c) => c.name === s.recipes.B.curveName)) {
    recipeB.value = s.recipes.B;
  }
  outputCfg.value = s.output;
}

export function loadFromStorage(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return;
  const parsed = parseStored(raw);
  if (parsed === null) return;
  applyStored(parsed);
}

// ---- Mutations ----
function existingMatches(p: ParamSchema, existing: ParamValue | undefined): boolean {
  if (existing === undefined) return false;
  if (p.kind === "breakpoints") return Array.isArray(existing);
  if (p.kind === "enum") return typeof existing === "string";
  return typeof existing === "number";
}

export function pickCurve(name: string): void {
  const schema = curves.value.find((c) => c.name === name);
  if (schema === undefined) return;
  const r = current();
  const merged: Record<string, ParamValue> = {};
  for (const p of schema.params) {
    const existing = r.params[p.name];
    merged[p.name] = existingMatches(p, existing) ? existing as ParamValue : cloneDefault(p.default);
  }
  setCurrent({ ...r, curveName: name, params: merged });
  curveMenuOpen.value = false;
}

export function setParam(name: string, value: ParamValue): void {
  const r = current();
  setCurrent({ ...r, params: { ...r.params, [name]: value } });
}

export function setTransformParam(id: string, name: string, value: number | string): void {
  const r = current();
  setCurrent({
    ...r,
    transforms: r.transforms.map((t) =>
      t.id === id ? { ...t, params: { ...t.params, [name]: value } } : t,
    ),
  });
}

export function addTransform(type: string): void {
  const schema = transformSchemas.value.find((t) => t.name === type);
  if (schema === undefined) return;
  const params: Record<string, number | string> = {};
  for (const p of schema.params) {
    if (typeof p.default === "number" || typeof p.default === "string") {
      params[p.name] = p.default;
    }
  }
  const r = current();
  setCurrent({
    ...r,
    transforms: [
      ...r.transforms,
      { id: `t${Date.now()}${Math.floor(Math.random() * 1000)}`, type, params },
    ],
  });
  transformMenuOpen.value = false;
}

export function removeTransform(id: string): void {
  const r = current();
  setCurrent({ ...r, transforms: r.transforms.filter((t) => t.id !== id) });
}

export function moveTransform(id: string, dir: -1 | 1): void {
  const r = current();
  const arr = [...r.transforms];
  const i = arr.findIndex((t) => t.id === id);
  const j = i + dir;
  const ti = arr[i];
  const tj = arr[j];
  if (i < 0 || j < 0 || j >= arr.length || ti === undefined || tj === undefined) return;
  arr[i] = tj;
  arr[j] = ti;
  setCurrent({ ...r, transforms: arr });
}

export function updateOutput<K extends keyof OutputConfig>(key: K, value: OutputConfig[K]): void {
  outputCfg.value = { ...outputCfg.value, [key]: value };
}
