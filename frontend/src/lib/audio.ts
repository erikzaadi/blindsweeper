import type { RefObject } from "react";
import type { GameSettings } from "../types";

export const FEEDBACK_COOLDOWN_MS = 80;
export const MIN_VIBRATION_MS = 24;
// A gesture within this window reuses a pending resume instead of starting another.
const RESUME_COALESCE_MS = 500;

export type SoundEffect = "mark" | "level-complete" | "level-complete-perfect" | "sound-check";
export type AudioRuntimeState = AudioContextState | "interrupted" | "unsupported" | "unknown";

export type FeedbackCapabilities = {
  audioSupported: boolean;
  audioState: AudioRuntimeState;
  audioUnlocked: boolean;
  hapticsSupported: boolean;
  hapticsFallback: boolean;
  lastVibrateAccepted: boolean | null;
  lastAudioUnlockError: string | null;
};

type WebKitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;
let pendingResume: { promise: Promise<void>; startedAt: number } | null = null;
let capabilities: FeedbackCapabilities = {
  audioSupported: Boolean(getAudioContextConstructor()),
  audioState: "unknown",
  audioUnlocked: false,
  hapticsSupported: hasVibrate(),
  hapticsFallback: hasSwitchFallback(),
  lastVibrateAccepted: null,
  lastAudioUnlockError: null,
};
const capabilityListeners = new Set<(capabilities: FeedbackCapabilities) => void>();

// iOS haptic: off-screen rendered checkbox with the Apple `switch` attribute.
// Must NOT be display:none - iOS only fires Taptic Engine on rendered elements.
let hapticInputEl: HTMLInputElement | null = null;

function getAudioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.AudioContext ?? (window as WebKitWindow).webkitAudioContext;
}

function hasVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

// Safari 17.4+ reflects the `switch` attribute; elsewhere the fallback does nothing.
function hasSwitchFallback(): boolean {
  return !hasVibrate()
    && typeof HTMLInputElement !== "undefined"
    && "switch" in HTMLInputElement.prototype;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function patchCapabilities(next: Partial<FeedbackCapabilities>): void {
  capabilities = { ...capabilities, ...next };
  capabilityListeners.forEach((listener) => listener(capabilities));
}

function refreshAudioCapabilities(): void {
  const supported = Boolean(getAudioContextConstructor());
  patchCapabilities({
    audioSupported: supported,
    audioState: audioContext ? (audioContext.state as AudioRuntimeState) : (supported ? "unknown" : "unsupported"),
    audioUnlocked: audioContext?.state === "running",
  });
}

export function getFeedbackCapabilities(): FeedbackCapabilities {
  return capabilities;
}

export function subscribeFeedbackCapabilities(
  listener: (capabilities: FeedbackCapabilities) => void,
): () => void {
  capabilityListeners.add(listener);
  listener(capabilities);
  return () => {
    capabilityListeners.delete(listener);
  };
}

export function isAudioRunning(): boolean {
  return audioContext?.state === "running";
}

// Creates the shared context. Only call from a trusted activation handler, so
// browsers start it running instead of suspended.
function ensureAudioContext(): AudioContext | null {
  if (audioContext && audioContext.state !== "closed") {
    return audioContext;
  }
  const Ctor = getAudioContextConstructor();
  if (!Ctor) {
    refreshAudioCapabilities();
    return null;
  }
  try {
    const ctx = new Ctor();
    // Interruptions are recovered on the next eligible gesture, not here:
    // resume() outside a gesture is rejected or left pending by some browsers.
    ctx.onstatechange = refreshAudioCapabilities;
    audioContext = ctx;
  } catch (error) {
    console.warn("[BlindSweeper] AudioContext construction failed", error);
    audioContext = null;
    patchCapabilities({ lastAudioUnlockError: errorMessage(error, "Audio construction failed") });
  }
  refreshAudioCapabilities();
  return audioContext;
}

function requestResume(ctx: AudioContext): Promise<void> {
  const now = performance.now();
  if (pendingResume && now - pendingResume.startedAt < RESUME_COALESCE_MS) {
    return pendingResume.promise;
  }
  let promise: Promise<void>;
  try {
    promise = ctx.resume();
  } catch (error) {
    promise = Promise.reject(error);
  }
  const entry = {
    startedAt: now,
    promise: promise
      .then(() => {
        patchCapabilities({ lastAudioUnlockError: null });
      })
      .catch((error: unknown) => {
        patchCapabilities({ lastAudioUnlockError: errorMessage(error, "Audio resume failed") });
      })
      .finally(() => {
        if (pendingResume === entry) {
          pendingResume = null;
        }
        refreshAudioCapabilities();
      }),
  };
  pendingResume = entry;
  return entry.promise;
}

// Call synchronously inside a trusted activation handler (pointerup/touchend for
// touch, pointerdown for mouse, keydown, click). Safe to call repeatedly.
export function unlockAudio(): Promise<void> {
  const ctx = ensureAudioContext();
  if (!ctx || ctx.state === "running") {
    return Promise.resolve();
  }
  return requestResume(ctx);
}

// Recover after backgrounding where the browser allows it; otherwise the next gesture retries.
export function resumeAudioIfVisible(): void {
  if (audioContext && audioContext.state !== "running" && audioContext.state !== "closed"
    && document.visibilityState === "visible") {
    void requestResume(audioContext);
  }
}

function ensureHapticInput(): HTMLInputElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  if (hapticInputEl) {
    return hapticInputEl;
  }
  const el = document.createElement("input");
  el.type = "checkbox";
  el.setAttribute("switch", "");
  el.tabIndex = -1;
  el.setAttribute("aria-hidden", "true");
  // Off-screen but rendered: visibility:hidden or display:none blocks iOS haptics
  el.style.cssText =
    "position:fixed;top:-200px;left:-200px;opacity:0;pointer-events:none;width:44px;height:44px";
  document.body.appendChild(el);
  hapticInputEl = el;
  return el;
}

export function triggerHaptic(duration: number): void {
  if (hasVibrate()) {
    try {
      const accepted = navigator.vibrate(Math.max(MIN_VIBRATION_MS, Math.round(duration)));
      patchCapabilities({ hapticsSupported: true, lastVibrateAccepted: accepted });
    } catch {
      patchCapabilities({ lastVibrateAccepted: false });
    }
    return;
  }
  if (!capabilities.hapticsFallback) {
    return;
  }
  // iOS: programmatic click on a rendered switch-type checkbox may trigger Taptic Engine (iOS 17.4+)
  try {
    ensureHapticInput()?.click();
  } catch {
    // blocked
  }
}

function playNote(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  gainValue: number,
  startAt: number,
  duration: number,
): void {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gainNode.gain.setValueAtTime(gainValue, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

function safePlay(play: (ctx: AudioContext) => void): void {
  const ctx = audioContext;
  if (!ctx || ctx.state !== "running") {
    return;
  }
  try {
    play(ctx);
  } catch (error) {
    console.warn("[BlindSweeper] Audio playback failed", error);
  }
}

function playProbeTone(ctx: AudioContext, intensity: number, force: boolean): void {
  const now = ctx.currentTime;
  const duration = force ? 0.16 : 0.035 + intensity * 0.045;
  playNote(ctx, force ? 110 : 160 + intensity * 520, force ? "sawtooth" : "sine", force ? 0.08 : 0.02 + intensity * 0.04, now, duration);
}

export function runFeedback(
  intensity: number,
  settings: GameSettings,
  lastFeedbackAtRef: RefObject<number>,
  force: boolean,
): void {
  if (intensity <= 0.03 && !force) {
    return;
  }

  const now = performance.now();
  if (!force && now - lastFeedbackAtRef.current < FEEDBACK_COOLDOWN_MS) {
    return;
  }
  lastFeedbackAtRef.current = now;

  if (settings.hapticsEnabled) {
    triggerHaptic(force ? 90 : Math.round(MIN_VIBRATION_MS + intensity * 38));
  }

  // Probe tones are dropped, not queued, while audio is not running: a late tone
  // would report proximity for a position the finger has already left.
  if (settings.audioEnabled) {
    safePlay((ctx) => playProbeTone(ctx, intensity, force));
  }
}

function playEffectNotes(ctx: AudioContext, type: SoundEffect): void {
  const now = ctx.currentTime;
  if (type === "mark") {
    playNote(ctx, 600, "sine", 0.07, now, 0.055);
    playNote(ctx, 900, "sine", 0.07, now + 0.045, 0.07);
  } else if (type === "sound-check") {
    playProbeTone(ctx, 0.65, false);
  } else if (type === "level-complete") {
    [261, 330, 392, 523].forEach((freq, i) => {
      playNote(ctx, freq, "sine", i === 3 ? 0.1 : 0.07, now + i * 0.09, i === 3 ? 0.22 : 0.08);
    });
  } else {
    [261, 330, 392, 523, 659, 784].forEach((freq, i) => {
      playNote(ctx, freq, "sine", i >= 4 ? 0.12 : 0.07, now + i * 0.08, i >= 4 ? 0.28 : 0.08);
    });
  }
}

// Effects wait for a resume already in flight (a few ms late is fine for a chime),
// but never create or resume the context themselves.
export function playSoundEffect(type: SoundEffect, audioEnabled: boolean): void {
  if (!audioEnabled || !audioContext) {
    return;
  }
  if (audioContext.state === "running") {
    safePlay((ctx) => playEffectNotes(ctx, type));
    return;
  }
  if (pendingResume) {
    void pendingResume.promise.then(() => safePlay((ctx) => playEffectNotes(ctx, type)));
  }
}
