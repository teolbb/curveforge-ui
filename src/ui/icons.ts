import htm from "htm";
import { h, type VNode } from "preact";

const html = htm.bind(h);

/** Compact path-only SVG icons. Each entry is the full `d` attribute (multiple
 * subpaths separated by `M` commands). Keep these terse so the data layer is
 * easy to scan. New icons should follow the same one-line convention. */
const PATHS: Record<string, string> = {
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8 12 3 7 8 M12 3 12 15",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10 12 15 17 10 M12 15 12 3",
  caret: "M6 9 12 15 18 9",
  plus: "M12 5 12 19 M5 12 19 12",
  power: "M18.36 6.64a9 9 0 1 1-12.73 0 M12 2 12 12",
  volume: "M11 5 6 9 2 9 2 15 6 15 11 19 11 5Z M15.54 8.46a5 5 0 0 1 0 7.07",
};

interface IconProps {
  name: string;
  size?: number;
  class?: string;
}

export const Icon = ({ name, size = 14, class: cls = "" }: IconProps): VNode | null => {
  const d = PATHS[name];
  if (d === undefined) return null;
  return html`<svg viewBox="0 0 24 24" width=${size} height=${size} fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round"
       stroke-linejoin="round" class=${cls} aria-hidden="true">
    <path d=${d}/>
  </svg>` as VNode;
};
