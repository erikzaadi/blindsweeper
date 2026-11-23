import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  computeProximity,
  containsCell,
  pointToCell,
  resolveDragCollision,
} from "../game/gameEngine";
import type {
  BoardPoint,
  BoardSize,
  CellCoord,
  GameSettings,
  LevelState,
  MarkHint,
} from "../types";
import { BOMB_ASSET_URL, EXPLOSION_ASSET_URL, MARK_ASSET_URL, MARK_CONFIRMED_ASSET_URL } from "../lib/assets";
import {
  getFeedbackCapabilities,
  isAudioRunning,
  playSoundEffect,
  resumeAudioIfVisible,
  runFeedback,
  subscribeFeedbackCapabilities,
  triggerHaptic,
  unlockAudio,
} from "../lib/audio";

const TAP_MOVEMENT_THRESHOLD_PX = 10;
const TAP_DURATION_THRESHOLD_MS = 450;

type PointerStart = {
  pointerId: number;
  captured: boolean;
  point: BoardPoint;
  board: BoardSize;
  startedAt: number;
  maxMovement: number;
};

type TrailPoint = {
  x: number;
  y: number;
  id: number;
  timestamp: number;
};

function eventPoint(event: PointerEvent<HTMLDivElement>): BoardPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function eventBoard(event: PointerEvent<HTMLDivElement>): BoardSize {
  const rect = event.currentTarget.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function distancePx(a: BoardPoint, b: BoardPoint): number {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return Math.sqrt(x * x + y * y);
}

function cellSlotStyle(cell: CellCoord, config: { cols: number; rows: number }): CSSProperties {
  return {
    left: `calc(${cell.col} / ${config.cols} * 100%)`,
    top: `calc(${cell.row} / ${config.rows} * 100%)`,
    width: `calc(100% / ${config.cols})`,
    height: `calc(100% / ${config.rows})`,
  };
}

function isSameCell(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

function findMarkHint(level: LevelState, cell: CellCoord): MarkHint | null {
  return level.markHints?.find((markHint) => isSameCell(markHint.cell, cell)) ?? null;
}

function formatMarkHint(intensity: number): string {
  return String(Math.max(1, Math.ceil(intensity * 9)));
}

function GestureHint({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 5000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1.5"
    >
      <p className="text-sm text-zinc-600">Drag to probe</p>
      <p className="text-sm text-zinc-600">Tap to mark</p>
    </div>
  );
}

export function BoardShell({
  settings,
  level,
  showGestureHint,
  onDismissGestureHint,
  onExplodeCell,
  onMarkCell,
  onProximityChange,
  onEnableVisualFeedback,
}: {
  settings: GameSettings;
  level: LevelState;
  showGestureHint: boolean;
  onDismissGestureHint: () => void;
  onExplodeCell: (cell: CellCoord) => void;
  onMarkCell: (cell: CellCoord) => void;
  onProximityChange: (intensity: number) => void;
  onEnableVisualFeedback: () => void;
}) {
  const pointerStartRef = useRef<PointerStart | null>(null);
  const lastFeedbackAtRef = useRef<number>(0);
  const [proximityIntensity, setProximityIntensity] = useState(0);
  const [hoverPoint, setHoverPoint] = useState<BoardPoint | null>(null);
  const [activeLevelId, setActiveLevelId] = useState<string>(level.id);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [probedCells, setProbedCells] = useState<CellCoord[]>([]);
  const [feedbackCapabilities, setFeedbackCapabilities] = useState(getFeedbackCapabilities);
  const active = level.status === "active";
  const visualFeedback = settings.visualFallbackEnabled && active;
  const needsAudioUnlock = settings.audioEnabled
    && feedbackCapabilities.audioSupported
    && !feedbackCapabilities.audioUnlocked;
  const hasAudioFeedback = settings.audioEnabled && feedbackCapabilities.audioSupported;
  // The iOS switch fallback is unverified, so only real vibration counts as feedback here.
  const hasHapticFeedback = settings.hapticsEnabled && feedbackCapabilities.hapticsSupported;
  const noProximityFeedback = !settings.visualFallbackEnabled && !hasAudioFeedback && !hasHapticFeedback;

  // Native capture-phase listeners run before React's handlers, so the context is
  // resumed before a mark sound plays. Only these events grant user activation:
  // touch pointerup/touchend, mouse pointerdown, keydown. They stay attached so a
  // later gesture can recover audio after an interruption or failed unlock.
  useEffect(() => {
    if (!settings.audioEnabled) {
      return;
    }
    function unlock(event: Event) {
      if (event.type === "pointerdown" && (event as globalThis.PointerEvent).pointerType !== "mouse") {
        return;
      }
      if (!isAudioRunning()) {
        void unlockAudio();
      }
    }
    const options = { capture: true, passive: true };
    const events = ["pointerdown", "pointerup", "touchend", "keydown"] as const;
    events.forEach((type) => document.addEventListener(type, unlock, options));
    document.addEventListener("visibilitychange", resumeAudioIfVisible);
    return () => {
      events.forEach((type) => document.removeEventListener(type, unlock, options));
      document.removeEventListener("visibilitychange", resumeAudioIfVisible);
    };
  }, [settings.audioEnabled]);

  useEffect(() => {
    return subscribeFeedbackCapabilities(setFeedbackCapabilities);
  }, []);

  if (activeLevelId !== level.id) {
    setActiveLevelId(level.id);
    setTrail([]);
    setProbedCells([]);
    setHoverPoint(null);
    setProximityIntensity(0);
  }

  // A gesture that started on the previous level must not mark or explode on the new one.
  useEffect(() => {
    pointerStartRef.current = null;
  }, [level.id]);

  // Board size changes (rotation, toolbar, window resize) invalidate the gesture's coordinates.
  useEffect(() => {
    function cancelOnResize() {
      if (pointerStartRef.current) {
        cancelGesture();
      }
    }
    window.addEventListener("resize", cancelOnResize);
    return () => window.removeEventListener("resize", cancelOnResize);
  });

  useEffect(() => {
    if (trail.length === 0) {
      return;
    }
    const interval = setInterval(() => {
      const now = performance.now();
      setTrail((prev) => {
        const next = prev.filter((p) => {
          return now - p.timestamp < 800;
        });
        if (next.length === prev.length) {
          return prev;
        }
        return next;
      });
    }, 100);
    return () => {
      clearInterval(interval);
    };
  }, [trail.length]);

  function updateProximity(intensity: number) {
    setProximityIntensity(intensity);
    onProximityChange(intensity);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (showGestureHint) {
      onDismissGestureHint();
    }

    // One gesture at a time, main mouse button only: a second finger or a
    // right-click must not mark or take over the gesture in progress.
    if (!active || pointerStartRef.current || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    let captured = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      captured = false;
    }
    const point = eventPoint(event);
    const board = eventBoard(event);
    pointerStartRef.current = {
      pointerId: event.pointerId,
      captured,
      point,
      board,
      startedAt: event.timeStamp,
      maxMovement: 0,
    };
    handlePointerProbe(point, board, false);
  }

  function ownGesture(event: PointerEvent<HTMLDivElement>): PointerStart | null {
    const start = pointerStartRef.current;
    return active && start && start.pointerId === event.pointerId ? start : null;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = ownGesture(event);
    if (!start) {
      return;
    }

    const point = eventPoint(event);
    start.maxMovement = Math.max(start.maxMovement, distancePx(start.point, point));
    handlePointerProbe(point, start.board, start.maxMovement > TAP_MOVEMENT_THRESHOLD_PX);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = ownGesture(event);
    if (!start) {
      return;
    }

    const point = eventPoint(event);
    start.maxMovement = Math.max(start.maxMovement, distancePx(start.point, point));
    pointerStartRef.current = null;
    updateProximity(0);

    const cell = pointToCell(start.point, start.board, level.config);
    const duration = event.timeStamp - start.startedAt;
    const tapped = start.maxMovement <= TAP_MOVEMENT_THRESHOLD_PX && duration <= TAP_DURATION_THRESHOLD_MS;
    if (tapped && !containsCell(level.markedCells, cell)) {
      playSoundEffect("mark", settings.audioEnabled);
      if (settings.hapticsEnabled) {
        triggerHaptic(30);
      }
      onMarkCell(cell);
    }
    setHoverPoint(null);
  }

  function cancelGesture() {
    pointerStartRef.current = null;
    updateProximity(0);
    setHoverPoint(null);
  }

  // Covers pointercancel and losing capture mid-gesture (released captures after
  // pointerup find no gesture and are ignored).
  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (ownGesture(event)) {
      cancelGesture();
    }
  }

  // Without capture, a pointer that leaves the board would never deliver its pointerup here.
  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    const start = ownGesture(event);
    if (start && !start.captured) {
      cancelGesture();
    }
  }

  function handleEnableSound() {
    void unlockAudio().then(() => playSoundEffect("sound-check", settings.audioEnabled));
  }

  // Uses the board size captured at gesture start so one gesture never mixes two layouts.
  function handlePointerProbe(point: BoardPoint, board: BoardSize, allowCollision: boolean) {
    const cell = pointToCell(point, board, level.config);
    const collision = resolveDragCollision(cell, level.mines, level.markedCells);
    if (allowCollision && collision.exploded && collision.cell) {
      pointerStartRef.current = null;
      setHoverPoint(null);
      updateProximity(1);
      runFeedback(1, settings, lastFeedbackAtRef, true);
      onExplodeCell(collision.cell);
      return;
    }

    const proximity = computeProximity(point, board, level.config, level.mines, level.markedCells);

    setProbedCells((prev) => {
      if (containsCell(prev, cell)) {
        return prev;
      }
      return [...prev, cell];
    });

    const normalized = {
      x: point.x / board.width,
      y: point.y / board.height,
    };
    setHoverPoint(normalized);

    const now = performance.now();
    setTrail((prev) => {
      return [
        ...prev.filter((p) => {
          return now - p.timestamp < 800;
        }),
        { x: normalized.x, y: normalized.y, id: now, timestamp: now },
      ];
    });

    updateProximity(proximity.intensity);
    runFeedback(proximity.intensity, settings, lastFeedbackAtRef, false);
  }

  return (
    <div
      className="relative flex flex-1 items-stretch bg-black p-3 sm:p-5"
      style={{
        backgroundColor: visualFeedback
          ? `rgb(${Math.round(6 + proximityIntensity * 42)} ${Math.round(6 + proximityIntensity * 10)} ${Math.round(6 + proximityIntensity * 10)})`
          : "#000",
      }}
    >
      <div
        className={[
          "relative flex-1 touch-none select-none overflow-hidden rounded bg-black [-webkit-touch-callout:none]",
          active ? "cursor-crosshair" : "cursor-default border border-red-950/60",
        ].join(" ")}
        role="application"
        aria-label="BlindSweeper minefield"
        onContextMenu={(event) => event.preventDefault()}
        onLostPointerCapture={handlePointerCancel}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          // Cap the minimum at the usable viewport (header, padding, safe areas) so short landscape screens don't overflow.
          minHeight: "min(520px, calc(100dvh - 6rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)))",
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)`,
          backgroundSize: `calc(100% / ${level.config.cols}) calc(100% / ${level.config.rows})`,
          backgroundPosition: `calc(50% / ${level.config.cols}) calc(50% / ${level.config.rows})`,
          boxShadow: visualFeedback
            ? [
              `inset 0 0 ${Math.round(20 + proximityIntensity * 160)}px rgba(16, 185, 129, ${(0.05 + proximityIntensity * 0.60).toFixed(2)})`,
              `inset 0 0 ${Math.round(proximityIntensity * 40)}px rgba(52, 211, 153, ${(proximityIntensity * 0.45).toFixed(2)})`,
              `0 0 ${Math.round(proximityIntensity * 28)}px rgba(16, 185, 129, ${(proximityIntensity * 0.55).toFixed(2)})`,
            ].join(", ")
            // Without visual feedback, keep the static edge glow so the board stays findable.
            : active ? "inset 0 0 20px rgba(16, 185, 129, 0.05)" : "inset 0 0 96px rgba(127, 29, 29, 0.28)",
          outline: visualFeedback && proximityIntensity > 0.05
            ? `${Math.round(1 + proximityIntensity * 3)}px solid rgba(52, 211, 153, ${(proximityIntensity * 0.85).toFixed(2)})`
            : undefined,
          outlineOffset: "-1px",
        }}
      >
        {visualFeedback && trail.map((p) => {
          return (
            <div
              key={p.id}
              className="animate-trail pointer-events-none absolute h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
              }}
            />
          );
        })}
        {active && probedCells.map((cell) => {
          return (
            <div
              key={`probed:${cell.row}:${cell.col}`}
              className="pointer-events-none absolute border border-white/[0.015] bg-emerald-500/[0.012]"
              style={cellSlotStyle(cell, level.config)}
            />
          );
        })}
        {hoverPoint && visualFeedback && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute flex items-center justify-center"
            style={{
              left: `${hoverPoint.x * 100}%`,
              top: `${hoverPoint.y * 100}%`,
              width: `calc(100% / ${level.config.cols})`,
              height: `calc(100% / ${level.config.rows})`,
              transform: `translate(-50%, -50%) scale(${1 - proximityIntensity * 0.45})`,
            }}
          >
            <div
              className="aspect-square h-full max-w-full rounded-full transition-colors duration-75"
              style={{
                backgroundColor: `rgba(${Math.round(255 - proximityIntensity * 239)}, ${Math.round(255 - proximityIntensity * 70)}, ${Math.round(255 - proximityIntensity * 126)}, ${0.06 + proximityIntensity * 0.34})`,
                boxShadow: proximityIntensity > 0.05
                  ? `0 0 ${Math.round(4 + proximityIntensity * 18)}px rgba(52, 211, 153, ${0.1 + proximityIntensity * 0.7})`
                  : undefined,
              }}
            />
          </div>
        )}
        {level.explosionCell && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute flex items-center justify-center"
            style={cellSlotStyle(level.explosionCell, level.config)}
          >
            <div className="relative flex aspect-square h-full max-w-full items-center justify-center">
              <div className="absolute -inset-[20%] rounded-full" style={{ background: "radial-gradient(circle, rgba(127,7,7,0.7) 0%, rgba(127,7,7,0.3) 50%, transparent 75%)" }} />
              <img
                alt=""
                className="relative z-10 h-full w-full object-contain"
                draggable="false"
                src={EXPLOSION_ASSET_URL}
              />
            </div>
          </div>
        )}
        {settings.debugReveal && level.mines
          .filter((cell) => !containsCell(level.markedCells, cell))
          .map((cell) => (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute"
              key={`mine:${cell.row}:${cell.col}`}
              style={cellSlotStyle(cell, level.config)}
            >
              <img
                alt=""
                className="absolute inset-[2%] h-[96%] w-[96%] object-contain opacity-80"
                draggable="false"
                src={BOMB_ASSET_URL}
              />
            </div>
          ))
        }
        {level.markedCells.map((cell) => {
          const markHint = findMarkHint(level, cell);
          const confirmed = markHint && formatMarkHint(markHint.intensity) === "9";
          return (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute"
              key={`mark:${cell.row}:${cell.col}`}
              style={cellSlotStyle(cell, level.config)}
            >
              <img
                alt=""
                className="absolute inset-[2%] h-[96%] w-[96%] object-contain"
                draggable="false"
                src={confirmed ? MARK_CONFIRMED_ASSET_URL : MARK_ASSET_URL}
              />
              {markHint ? (
                <span className="absolute bottom-0.5 right-0.5 z-10 text-[10px] font-semibold leading-none text-emerald-100 sm:text-xs">
                  {formatMarkHint(markHint.intensity)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {active && (
        <div className="pointer-events-none absolute left-6 top-6 z-10 flex max-w-[calc(100%-3rem)] sm:left-8 sm:top-8 sm:max-w-[calc(100%-4rem)] flex-wrap gap-2">
          {needsAudioUnlock && (
            <button
              className="pointer-events-auto rounded border border-emerald-500/70 bg-black/85 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.18)]"
              type="button"
              onClick={handleEnableSound}
            >
              Enable sound
            </button>
          )}
          {settings.audioEnabled && feedbackCapabilities.audioSupported && feedbackCapabilities.audioUnlocked && (
            <span className="rounded border border-zinc-700/80 bg-black/75 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-400">
              Sound ready
            </span>
          )}
          {settings.audioEnabled && !feedbackCapabilities.audioSupported && (
            <span className="rounded border border-red-900/70 bg-black/75 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-red-300">
              Sound unavailable
            </span>
          )}
          {settings.hapticsEnabled && !feedbackCapabilities.hapticsSupported && (
            <span className="rounded border border-zinc-700/80 bg-black/75 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500">
              {feedbackCapabilities.hapticsFallback ? "Haptics limited" : "Haptics unavailable"}
            </span>
          )}
          {noProximityFeedback && (
            <button
              className="pointer-events-auto rounded border border-amber-600/70 bg-black/85 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-amber-200"
              type="button"
              onClick={onEnableVisualFeedback}
            >
              No proximity feedback: turn on visuals
            </button>
          )}
        </div>
      )}
      {showGestureHint && active ? (
        <GestureHint onDismiss={onDismissGestureHint} />
      ) : null}
    </div>
  );
}
