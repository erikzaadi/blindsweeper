import { vi } from "vitest";

type ResumeBehavior = "resolve" | "reject" | "pending";

// Minimal AudioContext stand-in: jsdom has no Web Audio.
export class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static resumeBehavior: ResumeBehavior = "resolve";
  static throwOnConstruct = false;

  state: AudioContextState = "suspended";
  currentTime = 0;
  destination = {};
  onstatechange: (() => void) | null = null;

  resume = vi.fn(() => {
    if (FakeAudioContext.resumeBehavior === "reject") {
      return Promise.reject(new Error("NotAllowedError"));
    }
    if (FakeAudioContext.resumeBehavior === "pending") {
      return new Promise<void>(() => {});
    }
    this.state = "running";
    this.onstatechange?.();
    return Promise.resolve();
  });

  createOscillator = vi.fn(() => ({
    type: "sine",
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));

  createGain = vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }));

  constructor() {
    if (FakeAudioContext.throwOnConstruct) {
      throw new Error("Too many AudioContexts");
    }
    FakeAudioContext.instances.push(this);
  }

  static reset(): void {
    FakeAudioContext.instances = [];
    FakeAudioContext.resumeBehavior = "resolve";
    FakeAudioContext.throwOnConstruct = false;
  }
}
