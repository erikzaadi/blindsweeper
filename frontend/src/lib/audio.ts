import type { RefObject } from "react";
import type { GameSettings } from "../types";

export const FEEDBACK_COOLDOWN_MS = 80;

export type SoundEffect = "mark" | "level-complete" | "level-complete-perfect";

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

  if (settings.hapticsEnabled && "vibrate" in navigator) {
    try {
      const duration = force ? 90 : Math.round(8 + intensity * 42);
      navigator.vibrate(duration);
    } catch {
      // vibrate blocked by browser policy
    }
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
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) {
    return;
  }

  const context = audioContextRef.current ?? new AudioContextConstructor();
  audioContextRef.current = context;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime;
  const duration = force ? 0.16 : 0.035 + intensity * 0.045;

  oscillator.type = force ? "sawtooth" : "sine";
  oscillator.frequency.value = force ? 110 : 160 + intensity * 520;
  gain.gain.setValueAtTime(force ? 0.08 : 0.02 + intensity * 0.04, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

let sharedAudioContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  const Ctor = window.AudioContext;
  if (!Ctor) {
    return null;
  }
  if (!sharedAudioContext) {
    sharedAudioContext = new Ctor();
  }
  return sharedAudioContext;
}

export function playNote(ctx: AudioContext, freq: number, type: OscillatorType, gainValue: number, startAt: number, duration: number): void {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
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
  if (!ctx) {
    return;
  }
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
}
