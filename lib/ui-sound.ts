const MUTE_KEY = "cs-ui-sound-muted";
const COOLDOWN_MS = 110;
const MASTER_GAIN = 0.038;

type UiSoundKind = "press" | "success";

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;
let lastPlayAt = 0;
let muted = false;
let muteLoaded = false;

function readMuted() {
  if (muteLoaded || typeof window === "undefined") return muted;
  muteLoaded = true;
  muted = window.localStorage.getItem(MUTE_KEY) === "1";
  return muted;
}

export function getUiSoundMuted() {
  return readMuted();
}

export function setUiSoundMuted(next: boolean) {
  muted = next;
  muteLoaded = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  }
}

function ensureContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
    master = audioCtx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(audioCtx.destination);
  }
  return audioCtx;
}

export function unlockUiSound() {
  const ctx = ensureContext();
  if (ctx?.state === "suspended") void ctx.resume();
}

function tone(ctx: AudioContext, dest: AudioNode, when: number, frequency: number, duration: number) {
  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, when);
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(1, when + 0.014);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(envelope);
  envelope.connect(dest);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

export function playUiSound(kind: UiSoundKind) {
  if (typeof window === "undefined") return;
  if (document.hidden) return;
  if (readMuted()) return;

  const now = performance.now();
  if (now - lastPlayAt < COOLDOWN_MS) return;
  lastPlayAt = now;

  try {
    const ctx = ensureContext();
    if (!ctx || !master) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime + 0.01;
    if (kind === "press") {
      tone(ctx, master, t, 392, 0.07);
      return;
    }
    tone(ctx, master, t, 523.25, 0.09);
    tone(ctx, master, t + 0.1, 659.25, 0.12);
  } catch {
    // Autoplay or AudioContext can fail; stay silent.
  }
}
