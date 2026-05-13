// Live audio preview of a curve, applied via a 31-band parametric-EQ
// cascade at 1/3-octave centres. Each band's gain reads the curve's
// magnitude at that frequency — no per-curve filter mapping needed.
//
// The 31 peaking biquads at Q=2.871 (the standard "tetrahedral" Q for
// 1/3-octave bands) reconstruct any reasonably smooth magnitude target
// to within roughly ±0.5 dB across 20 Hz – 20 kHz. Room-correction
// curves are inherently smooth at this resolution, so the
// approximation is well-matched to the use case.

interface Curve {
  freqs: number[];
  gains_db: number[];
}

export type SourceName = "pink" | "sweep" | "upload";

// ISO 1/3-octave band centres covering the audible range.
const BAND_FREQS: readonly number[] = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500,
  16000, 20000,
];

const Q_THIRD_OCT = 2.871;

let ctx: AudioContext | null = null;
let filters: BiquadFilterNode[] = [];
let outputGain: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
let pinkBuffer: AudioBuffer | null = null;
let sweepBuffer: AudioBuffer | null = null;
let uploadBuffer: AudioBuffer | null = null;
let filterEnabled = true;

function ensureContext(): AudioContext {
  if (ctx !== null) return ctx;
  const audioCtx = new AudioContext();
  ctx = audioCtx;

  filters = BAND_FREQS.map((f) => {
    const bq = audioCtx.createBiquadFilter();
    bq.type = "peaking";
    bq.frequency.value = f;
    bq.Q.value = Q_THIRD_OCT;
    bq.gain.value = 0;
    return bq;
  });
  for (let i = 0; i < filters.length - 1; i++) {
    const a = filters[i];
    const b = filters[i + 1];
    if (a !== undefined && b !== undefined) a.connect(b);
  }

  outputGain = audioCtx.createGain();
  outputGain.gain.value = 0.4;
  const last = filters[filters.length - 1];
  if (last !== undefined) last.connect(outputGain);
  outputGain.connect(audioCtx.destination);

  pinkBuffer = generatePinkNoise(audioCtx, 10);
  sweepBuffer = generateLogSweep(audioCtx, 5, 20, 20000);

  return audioCtx;
}

export function play(sourceName: SourceName): void {
  const audioCtx = ensureContext();
  stop();
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  const buf = bufferFor(sourceName);
  if (buf === null) return; // upload requested but nothing loaded yet
  const node = audioCtx.createBufferSource();
  node.buffer = buf;
  node.loop = true;
  connectSource(node);
  node.start();
  source = node;
}

function bufferFor(sourceName: SourceName): AudioBuffer | null {
  if (sourceName === "pink") return pinkBuffer;
  if (sourceName === "sweep") return sweepBuffer;
  return uploadBuffer;
}

export async function loadAudioFile(
  file: File,
): Promise<{ name: string; durationSec: number; sampleRate: number }> {
  const audioCtx = ensureContext();
  const arrayBuffer = await file.arrayBuffer();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  uploadBuffer = decoded;
  return {
    name: file.name,
    durationSec: decoded.duration,
    sampleRate: decoded.sampleRate,
  };
}

export function stop(): void {
  if (source !== null) {
    try {
      source.stop();
    } catch {
      // already stopped
    }
    source.disconnect();
    source = null;
  }
}

export function setVolume(v: number): void {
  if (outputGain !== null) outputGain.gain.value = v;
}

export function setFilterEnabled(on: boolean): void {
  filterEnabled = on;
  if (source !== null) {
    source.disconnect();
    connectSource(source);
  }
}

export function setCurve(curve: Curve): void {
  if (filters.length === 0) return;
  for (let i = 0; i < BAND_FREQS.length; i++) {
    const filter = filters[i];
    const band = BAND_FREQS[i];
    if (filter !== undefined && band !== undefined) {
      filter.gain.value = sampleCurveDB(curve, band);
    }
  }
}

function connectSource(node: AudioBufferSourceNode): void {
  const head = filters[0];
  if (filterEnabled && head !== undefined) {
    node.connect(head);
  } else if (outputGain !== null) {
    node.connect(outputGain);
  }
}

/** Index of the largest freq in `freqs` that is ≤ f. Assumes `freqs` is sorted ascending. */
function bisectLeft(freqs: readonly number[], f: number): number {
  let lo = 0;
  let hi = freqs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((freqs[mid] ?? 0) <= f) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Log-linear interpolation of `curve` at frequency `f`, with edge-clamp. */
function sampleCurveDB(curve: Curve, f: number): number {
  const { freqs, gains_db: gains } = curve;
  const n = freqs.length;
  if (n === 0) return 0;
  if (f <= (freqs[0] ?? 0)) return gains[0] ?? 0;
  if (f >= (freqs[n - 1] ?? 0)) return gains[n - 1] ?? 0;
  const lo = bisectLeft(freqs, f);
  const hi = lo + 1;
  const fLo = freqs[lo] ?? 1;
  const fHi = freqs[hi] ?? 1;
  const gLo = gains[lo] ?? 0;
  const gHi = gains[hi] ?? 0;
  const t = (Math.log10(f) - Math.log10(fLo)) / (Math.log10(fHi) - Math.log10(fLo));
  return gLo + t * (gHi - gLo);
}

// Paul Kellet's pink filter on a white-noise source. Approximate,
// audibly indistinguishable from a true 1/f spectrum for casual listening.
function generatePinkNoise(audioCtx: AudioContext, seconds: number): AudioBuffer {
  const fs = audioCtx.sampleRate;
  const len = Math.floor(fs * seconds);
  const buf = audioCtx.createBuffer(1, len, fs);
  const data = buf.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

// Logarithmic frequency sweep via phase integration. Equal-energy per octave,
// natural-sounding "whoosh" from low to high.
function generateLogSweep(
  audioCtx: AudioContext,
  seconds: number,
  fStart: number,
  fEnd: number,
): AudioBuffer {
  const fs = audioCtx.sampleRate;
  const len = Math.floor(fs * seconds);
  const buf = audioCtx.createBuffer(1, len, fs);
  const data = buf.getChannelData(0);
  const logRatio = Math.log(fEnd / fStart);
  const k = (fStart * seconds) / logRatio;
  for (let i = 0; i < len; i++) {
    const t = i / fs;
    const phase = 2 * Math.PI * k * (Math.exp((t * logRatio) / seconds) - 1);
    data[i] = Math.sin(phase) * 0.3;
  }
  // Apply linear fade-in/out (~50 ms) to avoid clicks at loop boundaries.
  const fadeLen = Math.min(len, Math.floor(fs * 0.05));
  for (let i = 0; i < fadeLen; i++) {
    const w = i / fadeLen;
    const head = data[i] ?? 0;
    const tail = data[len - 1 - i] ?? 0;
    data[i] = head * w;
    data[len - 1 - i] = tail * w;
  }
  return buf;
}
