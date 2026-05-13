// Entry point: mount the UI, wire global listeners, kick off bootstrap.
// State + engine side effects live under `engine/`; view layer under `ui/`.
import { effect } from "@preact/signals";
import htm from "htm";
import { h, render } from "preact";

import { setCurve as audioSetCurve } from "./engine/audio";
import { bootstrap, buildCurveFor } from "./engine/bridge";
import {
  activeSlot,
  appVisible,
  curveMenuOpen,
  pyReady,
  recipeA,
  recipeB,
  setStatus,
  transformMenuOpen,
} from "./engine/state";
import { toggleBypass } from "./ui/actions";
import { App } from "./ui/App";
import { renderPlot, type PlottedCurve } from "./ui/plot";

const html = htm.bind(h);

const SLOT_COLOR = { A: "var(--curve)", B: "var(--curve-b)" } as const;

// Plot + audio update whenever the active recipe or engine readiness changes.
effect(() => {
  if (!pyReady.value) return;
  try {
    const cA = buildCurveFor(recipeA.value, "twelfth_octave");
    const cB = buildCurveFor(recipeB.value, "twelfth_octave");
    const plotted: PlottedCurve[] = [
      { curve: cA, color: SLOT_COLOR.A, label: "A", emphasized: activeSlot.value === "A" },
      { curve: cB, color: SLOT_COLOR.B, label: "B", emphasized: activeSlot.value === "B" },
    ];
    renderPlot("plot", plotted);
    audioSetCurve(activeSlot.value === "A" ? cA : cB);
  } catch (err) {
    setStatus(`build_curve failed: ${(err as Error).message}`, "error");
  }
});

// Mirror the active slot onto <body> so CSS can theme by slot.
effect(() => {
  document.body.dataset["activeSlot"] = activeSlot.value;
});

// Keyboard shortcuts (skip when typing into an input).
document.addEventListener("keydown", (ev) => {
  if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement) return;
  const k = ev.key.toLowerCase();
  if (ev.code === "Space") {
    toggleBypass();
    ev.preventDefault();
  } else if (k === "a") {
    activeSlot.value = "A";
    ev.preventDefault();
  } else if (k === "b") {
    activeSlot.value = "B";
    ev.preventDefault();
  } else if (k === "s") {
    const tmp = recipeA.value;
    recipeA.value = recipeB.value;
    recipeB.value = tmp;
    ev.preventDefault();
  }
});

document.addEventListener("click", () => {
  if (curveMenuOpen.value) curveMenuOpen.value = false;
  if (transformMenuOpen.value) transformMenuOpen.value = false;
});

render(html`<${App}/>`, document.body);

bootstrap(() => {
  appVisible.value = true;
}).catch((err: Error) => {
  setStatus(`Error: ${err.message}`, "error");
});
