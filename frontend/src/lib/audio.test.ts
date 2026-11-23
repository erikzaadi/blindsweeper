import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeAudioContext } from "../test/fakeAudioContext";
import { DEFAULT_SETTINGS } from "./localStorageState";

type AudioModule = typeof import("./audio");

// audio.ts keeps module-level state, so each test gets a fresh copy.
async function loadAudio(withAudioContext = true): Promise<AudioModule> {
  if (withAudioContext) {
    vi.stubGlobal("AudioContext", FakeAudioContext);
  } else {
    vi.stubGlobal("AudioContext", undefined);
  }
  vi.resetModules();
  return import("./audio");
}

const settings = { ...DEFAULT_SETTINGS, audioEnabled: true, hapticsEnabled: false };

describe("audio feedback", () => {
  beforeEach(() => {
    FakeAudioContext.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports unsupported audio and plays nothing when the API is absent", async () => {
    const audio = await loadAudio(false);

    await expect(audio.unlockAudio()).resolves.toBeUndefined();
    expect(() => audio.playSoundEffect("mark", true)).not.toThrow();
    expect(audio.getFeedbackCapabilities().audioSupported).toBe(false);
  });

  it("survives a failing AudioContext constructor", async () => {
    FakeAudioContext.throwOnConstruct = true;
    const audio = await loadAudio();
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(audio.unlockAudio()).resolves.toBeUndefined();
    expect(audio.getFeedbackCapabilities().lastAudioUnlockError).toMatch(/too many/i);
    expect(() => audio.runFeedback(0.8, settings, { current: 0 }, true)).not.toThrow();
  });

  it("creates one shared context across repeated unlocks", async () => {
    const audio = await loadAudio();

    await audio.unlockAudio();
    await audio.unlockAudio();

    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(audio.isAudioRunning()).toBe(true);
    expect(audio.getFeedbackCapabilities().audioUnlocked).toBe(true);
  });

  it("does not resume an already running context", async () => {
    const audio = await loadAudio();
    await audio.unlockAudio();
    const ctx = FakeAudioContext.instances[0];

    await audio.unlockAudio();

    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it("records a rejected resume and retries on the next gesture", async () => {
    FakeAudioContext.resumeBehavior = "reject";
    const audio = await loadAudio();

    await audio.unlockAudio();
    expect(audio.getFeedbackCapabilities().lastAudioUnlockError).toMatch(/notallowed/i);
    expect(audio.isAudioRunning()).toBe(false);

    FakeAudioContext.resumeBehavior = "resolve";
    await audio.unlockAudio();

    expect(FakeAudioContext.instances[0].resume).toHaveBeenCalledTimes(2);
    expect(audio.isAudioRunning()).toBe(true);
    expect(audio.getFeedbackCapabilities().lastAudioUnlockError).toBeNull();
  });

  it("coalesces gestures during a pending resume, then lets a later gesture retry", async () => {
    FakeAudioContext.resumeBehavior = "pending";
    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    const audio = await loadAudio();

    void audio.unlockAudio();
    void audio.unlockAudio();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.resume).toHaveBeenCalledTimes(1);

    now.mockReturnValue(2000);
    FakeAudioContext.resumeBehavior = "resolve";
    await audio.unlockAudio();

    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(audio.isAudioRunning()).toBe(true);
  });

  it("drops probe tones while audio is not running", async () => {
    FakeAudioContext.resumeBehavior = "pending";
    const audio = await loadAudio();
    void audio.unlockAudio();
    const ctx = FakeAudioContext.instances[0];

    audio.runFeedback(0.9, settings, { current: 0 }, false);
    audio.runFeedback(1, settings, { current: 0 }, true);

    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it("plays probe tones once running", async () => {
    const audio = await loadAudio();
    await audio.unlockAudio();
    const ctx = FakeAudioContext.instances[0];

    audio.runFeedback(0.9, settings, { current: 0 }, false);

    expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
  });

  it("never creates a context from playback alone", async () => {
    const audio = await loadAudio();

    audio.playSoundEffect("mark", true);
    audio.runFeedback(0.9, settings, { current: 0 }, true);

    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("respects the sound setting", async () => {
    const audio = await loadAudio();
    await audio.unlockAudio();
    const ctx = FakeAudioContext.instances[0];

    audio.playSoundEffect("mark", false);
    audio.runFeedback(0.9, { ...settings, audioEnabled: false }, { current: 0 }, true);

    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });
});
