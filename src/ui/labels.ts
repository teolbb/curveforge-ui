// User-facing labels for snake_case curve and param identifiers from curveforge.
export const CURVE_SHORT: Record<string, string> = {
  harman: "Harman",
  olive_welti_inroom: "Olive-Welti",
  b_and_k: "Brüel & Kjær",
  toole_inroom: "Toole",
  welti_sub: "Sub shelf",
  flat: "Flat",
  breakpoints: "Custom",
};

const PARAM: Record<string, string> = {
  shelf_level: "Bass shelf",
  shelf_corner: "Shelf corner",
  bass_shelf: "Bass shelf",
  bass_corner: "Bass corner",
  bass_level: "Bass level",
  treble_tilt: "Treble tilt",
  treble_slope: "Treble slope",
  tilt: "Treble tilt",
  tilt_anchor: "Tilt anchor",
  tilt_corner: "Tilt corner",
  crossover_hz: "Crossover",
  anchor_hz: "Anchor",
  low_hz: "Low",
  high_hz: "High",
  db_per_octave: "Slope",
  gain_db: "Gain",
  freq: "Frequency",
  corner: "Corner",
  type: "Type",
  q: "Q",
  taper: "Taper",
  order: "Order",
};

export function paramLabel(name: string): string {
  const known = PARAM[name];
  if (known !== undefined) return known;
  const s = name.replace(/_hz$/, "").replace(/_db$/, "").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function titleCase(s: string): string {
  return s
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatValue(name: string, v: number, kind: string): string {
  if (kind === "integer") return `${Math.round(v)}`;
  if (/(_hz|_corner|_anchor|crossover|^freq$|^corner$|^anchor$)/.test(name)) {
    return v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`;
  }
  if (/(tilt|slope|per_octave)/.test(name)) return `${v.toFixed(2)} dB/oct`;
  if (name === "q" || name === "Q") return `Q ${v.toFixed(2)}`;
  if (name === "taper") return v.toFixed(2);
  return `${v.toFixed(1)} dB`;
}
