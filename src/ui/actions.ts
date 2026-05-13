// UI handlers that mutate state AND poke the audio module or open file
// pickers. Pure state mutations live in `engine/state.ts`.
import {
  loadAudioFile,
  play as audioPlay,
  setFilterEnabled,
  setVolume,
  stop as audioStop,
  type SourceName,
} from "../engine/audio";
import { bypass, playing, source, uploadInfo, volume } from "../engine/state";

export function togglePlay(): void {
  if (playing.value) audioStop();
  else audioPlay(source.value);
  playing.value = !playing.value;
}

export function toggleBypass(): void {
  bypass.value = !bypass.value;
  setFilterEnabled(!bypass.value);
}

export function setSourceValue(v: SourceName): void {
  if (v === "upload" && uploadInfo.value === null) {
    (document.getElementById("audio_upload") as HTMLInputElement).click();
    return;
  }
  source.value = v;
  if (playing.value) audioPlay(v);
}

export function setVolumeValue(v: number): void {
  volume.value = v;
  setVolume(v);
}

export function handleFile(file: File): void {
  uploadInfo.value = { name: file.name, meta: "Decoding…", error: false };
  loadAudioFile(file)
    .then(({ name, durationSec, sampleRate }) => {
      const mins = Math.floor(durationSec / 60);
      const secs = Math.floor(durationSec % 60).toString().padStart(2, "0");
      uploadInfo.value = { name, meta: `${mins}:${secs} · ${sampleRate} Hz`, error: false };
      source.value = "upload";
      if (playing.value) audioPlay("upload");
    })
    .catch((err: Error) => {
      uploadInfo.value = { name: "", meta: `Couldn't decode: ${err.message}`, error: true };
    });
}
