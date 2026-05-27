import type { RefObject } from "react";
import type { GameSettings } from "../types";

export const FEEDBACK_COOLDOWN_MS = 80;

export type SoundEffect = "mark" | "level-complete" | "level-complete-perfect";

let sharedAudioContext: AudioContext | null = null;

// iOS haptic: off-screen rendered checkbox with the Apple `switch` attribute.
// Must NOT be display:none — iOS only fires Taptic Engine on rendered elements.
let hapticInputEl: HTMLInputElement | null = null;

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
  // Off-screen but rendered: visibility:hidden or display:none blocks iOS haptics
  el.style.cssText =
    "position:fixed;top:-200px;left:-200px;opacity:0;pointer-events:none;width:44px;height:44px";
  document.body.appendChild(el);
  hapticInputEl = el;
  return el;
}

function setupAudioContextStateChange(ctx: AudioContext): void {
  ctx.onstatechange = () => {
    // Auto-resume after phone call, backgrounding, or any OS interruption
    if (ctx.state === "suspended" || (ctx.state as string) === "interrupted") {
      void ctx.resume();
    }
  };
}

export function triggerHaptic(duration: number, _intensity: number): void {
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(Math.round(duration));
    } catch {
      // blocked by browser policy
    }
    return;
  }
  // iOS: programmatic click on a rendered switch-type checkbox may trigger Taptic Engine (iOS 17+)
  try {
    ensureHapticInput()?.click();
  } catch {
    // blocked
  }
}

// Call this from a native touchstart/pointerdown handler to unlock both audio
// contexts on iOS. iOS suspends AudioContext until a user gesture; this must be
// called synchronously within the gesture to satisfy that requirement.
export function unlockAudio(audioContextRef: RefObject<AudioContext | null>): void {
  const Ctor = window.AudioContext;
  if (!Ctor) {
    return;
  }

  if (!audioContextRef.current) {
    const ctx = new Ctor();
    audioContextRef.current = ctx;
    setupAudioContextStateChange(ctx);
  }
  if (audioContextRef.current.state !== "running") {
    void audioContextRef.current.resume();
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new Ctor();
    setupAudioContextStateChange(sharedAudioContext);
  }
  if (sharedAudioContext.state !== "running") {
    void sharedAudioContext.resume();
  }
}

function scheduleOscillator(ctx: AudioContext, intensity: number, force: boolean): void {
  const now = ctx.currentTime;
  const duration = force ? 0.16 : 0.035 + intensity * 0.045;
  const osc = new OscillatorNode(ctx, {
    type: force ? "sawtooth" : "sine",
    frequency: force ? 110 : 160 + intensity * 520,
  });
  const gain = new GainNode(ctx);
  gain.gain.setValueAtTime(force ? 0.08 : 0.02 + intensity * 0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export function runFeedback(
  intensity: number,
  settings: GameSettings,
  audioContextRef: RefObject<AudioContext | null>,
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
    const duration = force ? 90 : Math.round(8 + intensity * 42);
    triggerHaptic(duration, force ? 1 : intensity);
  }

  if (settings.audioEnabled) {
    playFeedbackTone(intensity, audioContextRef, force);
  }
}

export function playFeedbackTone(
  intensity: number,
  audioContextRef: RefObject<AudioContext | null>,
  force: boolean,
): void {
  const Ctor = window.AudioContext;
  if (!Ctor) {
    return;
  }

  const context = audioContextRef.current ?? new Ctor();
  if (!audioContextRef.current) {
    audioContextRef.current = context;
    setupAudioContextStateChange(context);
  }

  if (context.state === "closed") {
    return;
  }

  if (context.state !== "running") {
    // resume() is a Promise; await it before scheduling audio (required on iOS)
    void context.resume().then(() => scheduleOscillator(context, intensity, force));
    return;
  }

  scheduleOscillator(context, intensity, force);
}

export function getSharedAudioContext(): AudioContext | null {
  const Ctor = window.AudioContext;
  if (!Ctor) {
    return null;
  }
  if (!sharedAudioContext) {
    sharedAudioContext = new Ctor();
    setupAudioContextStateChange(sharedAudioContext);
  }
  return sharedAudioContext;
}

export function playNote(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  gainValue: number,
  startAt: number,
  duration: number,
): void {
  const osc = new OscillatorNode(ctx, { type, frequency: freq });
  const gainNode = new GainNode(ctx);
  gainNode.gain.setValueAtTime(gainValue, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

export function playSoundEffect(type: SoundEffect, audioEnabled: boolean): void {
  if (!audioEnabled) {
    return;
  }
  const ctx = getSharedAudioContext();
  if (!ctx || ctx.state === "closed") {
    return;
  }

  const doPlay = () => {
    const now = ctx.currentTime;
    if (type === "mark") {
      playNote(ctx, 600, "sine", 0.07, now, 0.055);
      playNote(ctx, 900, "sine", 0.07, now + 0.045, 0.07);
    } else if (type === "level-complete") {
      const notes = [261, 330, 392, 523];
      notes.forEach((freq, i) => {
        playNote(ctx, freq, "sine", i === 3 ? 0.1 : 0.07, now + i * 0.09, i === 3 ? 0.22 : 0.08);
      });
    } else if (type === "level-complete-perfect") {
      const notes = [261, 330, 392, 523, 659, 784];
      notes.forEach((freq, i) => {
        playNote(ctx, freq, "sine", i >= 4 ? 0.12 : 0.07, now + i * 0.08, i >= 4 ? 0.28 : 0.08);
      });
    }
  };

  if (ctx.state !== "running") {
    // resume() is a Promise; await it before scheduling audio (required on iOS)
    void ctx.resume().then(doPlay);
    return;
  }
  doPlay();
}
