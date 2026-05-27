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
import { playSoundEffect, runFeedback } from "../lib/audio";

const TAP_MOVEMENT_THRESHOLD_PX = 10;
const TAP_DURATION_THRESHOLD_MS = 450;

type PointerStart = {
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
}: {
  settings: GameSettings;
  level: LevelState;
  showGestureHint: boolean;
  onDismissGestureHint: () => void;
  onExplodeCell: (cell: CellCoord) => void;
  onMarkCell: (cell: CellCoord) => void;
  onProximityChange: (intensity: number) => void;
}) {
  const pointerStartRef = useRef<PointerStart | null>(null);
  const lastFeedbackAtRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [proximityIntensity, setProximityIntensity] = useState(0);
  const [hoverPoint, setHoverPoint] = useState<BoardPoint | null>(null);
  const [activeLevelId, setActiveLevelId] = useState<string>(level.id);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [probedCells, setProbedCells] = useState<CellCoord[]>([]);
  const active = level.status === "active";

  if (activeLevelId !== level.id) {
    setActiveLevelId(level.id);
    setTrail([]);
    setProbedCells([]);
  }

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

    if (!active) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = eventPoint(event);
    const board = eventBoard(event);
    pointerStartRef.current = {
      point,
      board,
      startedAt: event.timeStamp,
      maxMovement: 0,
    };
    handlePointerProbe(event, point, false);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!active || !pointerStartRef.current) {
      return;
    }

    const point = eventPoint(event);
    const start = pointerStartRef.current;
    start.maxMovement = Math.max(start.maxMovement, distancePx(start.point, point));
    handlePointerProbe(event, point, start.maxMovement > TAP_MOVEMENT_THRESHOLD_PX);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!active || !pointerStartRef.current) {
      return;
    }

    const point = eventPoint(event);
    const start = pointerStartRef.current;
    start.maxMovement = Math.max(start.maxMovement, distancePx(start.point, point));
    pointerStartRef.current = null;
    updateProximity(0);

    const cell = pointToCell(start.point, start.board, level.config);
    const duration = event.timeStamp - start.startedAt;
    const tapped = start.maxMovement <= TAP_MOVEMENT_THRESHOLD_PX && duration <= TAP_DURATION_THRESHOLD_MS;
    if (tapped && !containsCell(level.markedCells, cell)) {
      playSoundEffect("mark", settings.audioEnabled);
      if (settings.hapticsEnabled && "vibrate" in navigator) {
        try {
          navigator.vibrate(30);
        } catch {
          // vibrate blocked by browser policy
        }
      }
      onMarkCell(cell);
    }
    setHoverPoint(null);
  }

  function handlePointerCancel() {
    pointerStartRef.current = null;
    updateProximity(0);
    setHoverPoint(null);
  }

  function handlePointerProbe(event: PointerEvent<HTMLDivElement>, point: BoardPoint, allowCollision: boolean) {
    const board = eventBoard(event);
    const cell = pointToCell(point, board, level.config);
    const collision = resolveDragCollision(cell, level.mines, level.markedCells);
    if (allowCollision && collision.exploded && collision.cell) {
      pointerStartRef.current = null;
      setHoverPoint(null);
      updateProximity(1);
      runFeedback(1, settings, audioContextRef, lastFeedbackAtRef, true);
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
    runFeedback(proximity.intensity, settings, audioContextRef, lastFeedbackAtRef, false);
  }

  return (
    <div
      className="relative flex flex-1 items-stretch bg-black p-3 sm:p-5"
      style={{
        backgroundColor: settings.visualFallbackEnabled && active
          ? `rgb(${Math.round(6 + proximityIntensity * 42)} ${Math.round(6 + proximityIntensity * 10)} ${Math.round(6 + proximityIntensity * 10)})`
          : "#000",
      }}
    >
      <div
        className={[
          "relative min-h-[520px] flex-1 touch-none select-none overflow-hidden rounded bg-black",
          active ? "cursor-crosshair" : "cursor-default border border-red-950/60",
        ].join(" ")}
        role="application"
        aria-label="BlindSweeper minefield"
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)`,
          backgroundSize: `calc(100% / ${level.config.cols}) calc(100% / ${level.config.rows})`,
          backgroundPosition: `calc(50% / ${level.config.cols}) calc(50% / ${level.config.rows})`,
          boxShadow: active
            ? [
              `inset 0 0 ${Math.round(20 + proximityIntensity * 160)}px rgba(16, 185, 129, ${(0.05 + proximityIntensity * 0.60).toFixed(2)})`,
              `inset 0 0 ${Math.round(proximityIntensity * 40)}px rgba(52, 211, 153, ${(proximityIntensity * 0.45).toFixed(2)})`,
              `0 0 ${Math.round(proximityIntensity * 28)}px rgba(16, 185, 129, ${(proximityIntensity * 0.55).toFixed(2)})`,
            ].join(", ")
            : "inset 0 0 96px rgba(127, 29, 29, 0.28)",
          outline: active && proximityIntensity > 0.05
            ? `${Math.round(1 + proximityIntensity * 3)}px solid rgba(52, 211, 153, ${(proximityIntensity * 0.85).toFixed(2)})`
            : undefined,
          outlineOffset: "-1px",
        }}
      >
        {active && trail.map((p) => {
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
        {hoverPoint && settings.visualFallbackEnabled && active && (
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
      {showGestureHint && active ? (
        <GestureHint onDismiss={onDismissGestureHint} />
      ) : null}
    </div>
  );
}
