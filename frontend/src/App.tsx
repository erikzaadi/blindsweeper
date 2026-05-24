import {
  Component,
  type CSSProperties,
  type ErrorInfo,
  type MutableRefObject,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  computeProximity,
  containsCell,
  pointToCell,
  resolveDragCollision,
} from "./game/gameEngine";
import type {
  BoardPoint,
  BoardSize,
  CellCoord,
  GameSettings,
  LevelState,
  MarkHint,
  PersistedGameState,
} from "./types";
import {
  failCurrentLevel,
  getPlayerStats,
  getSelectedRunSnapshot,
  markCurrentLevel,
  resetCurrentLevel,
  resetRunLevel,
  startRun,
} from "./lib/gameState";
import {
  DEFAULT_PROFILE_ID,
  clearPersistedGameState,
  loadPersistedGameState,
  savePersistedGameState,
} from "./lib/localStorageState";
import "./styles.css";

const TAP_MOVEMENT_THRESHOLD_PX = 10;
const TAP_DURATION_THRESHOLD_MS = 450;
const FEEDBACK_COOLDOWN_MS = 80;
const GESTURE_HINT_KEY = "blindsweeper:gesture-hint-dismissed";
const MARK_ASSET_URL = assetUrl("images/game/mark.png");
const MARK_CONFIRMED_ASSET_URL = assetUrl("images/game/mark-confirmed.png");
const BOMB_ASSET_URL = assetUrl("images/game/bomb.png");
const EXPLOSION_ASSET_URL = assetUrl("images/game/explosion.png");
const LEVEL_COMPLETE_ASSET_URL = assetUrl("images/game/level-complete.png");

type AppRoute = "home" | "settings" | "game";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

type PointerStart = {
  point: BoardPoint;
  startedAt: number;
  maxMovement: number;
};

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[BlindSweeper] App render failure", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
          <section className="w-full max-w-md rounded border border-red-900/70 bg-red-950/20 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-300">Recovery</p>
            <h1 className="mt-3 text-2xl font-semibold">BlindSweeper could not render this save.</h1>
            <button
              className="mt-5 w-full rounded border border-red-400/60 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-400/10"
              type="button"
              onClick={() => {
                clearPersistedGameState();
                window.location.reload();
              }}
            >
              Reset local data
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export function App() {
  return (
    <AppErrorBoundary>
      <BlindSweeperApp />
    </AppErrorBoundary>
  );
}

function BlindSweeperApp() {
  const [state, setState] = useState<PersistedGameState>(() => loadPersistedGameState());
  const [route, setRoute] = useState<AppRoute>(() => routeFromPath(window.location.pathname));
  const [gestureHintDismissed, setGestureHintDismissed] = useState(
    () => localStorage.getItem(GESTURE_HINT_KEY) === "1",
  );
  const [confirmingNewRun, setConfirmingNewRun] = useState(false);
  const [proximityIntensity, setProximityIntensity] = useState(0);
  const [celebratingLevel, setCelebratingLevel] = useState<{ levelNumber: number; score: number } | null>(null);
  const prevLevelNumberRef = useRef<number | null>(null);

  const snapshot = useMemo(() => getSelectedRunSnapshot(state), [state]);
  const stats = useMemo(() => getPlayerStats(state, DEFAULT_PROFILE_ID), [state]);

  useEffect(() => {
    savePersistedGameState(state);
  }, [state]);

  useEffect(() => {
    function handlePopState() {
      setRoute(routeFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!confirmingNewRun) {
      return;
    }
    const id = setTimeout(() => setConfirmingNewRun(false), 3000);
    return () => clearTimeout(id);
  }, [confirmingNewRun]);

  useEffect(() => {
    if (!snapshot || snapshot.run.status !== "active") {
      prevLevelNumberRef.current = null;
      return;
    }
    const current = snapshot.currentLevel.levelNumber;
    const prev = prevLevelNumberRef.current;
    if (prev !== null && current > prev) {
      const completedLevel = state.levels
        .filter((l) => l.runId === snapshot.run.id && l.levelNumber === prev && l.status === "completed")
        .at(-1);
      const score = completedLevel ? computeLevelScore(completedLevel) : 100;
      setCelebratingLevel({ levelNumber: prev, score });
    }
    prevLevelNumberRef.current = current;
  }, [snapshot, state.levels]);

  useEffect(() => {
    if (celebratingLevel === null) {
      return;
    }
    playSoundEffect(celebratingLevel.score === 100 ? "level-complete-perfect" : "level-complete", state.settings.audioEnabled);
    const id = setTimeout(() => setCelebratingLevel(null), 2500);
    return () => clearTimeout(id);
  }, [celebratingLevel, state.settings.audioEnabled]);

  function handleStartRun() {
    const isActive = snapshot?.run.status === "active";
    if (isActive && !confirmingNewRun) {
      setConfirmingNewRun(true);
      return;
    }
    setConfirmingNewRun(false);
    setState((s) => startRun(s));
    navigateTo("game", setRoute);
  }

  function handleDismissGestureHint() {
    localStorage.setItem(GESTURE_HINT_KEY, "1");
    setGestureHintDismissed(true);
  }

  function handleOpenGame() {
    navigateTo("game", setRoute);
  }

  function handleCloseGame() {
    navigateTo("home", setRoute);
  }

  function handleOpenSettings() {
    navigateTo("settings", setRoute);
  }

  function handleCloseSettings() {
    navigateTo("home", setRoute);
  }

  function handleResetLevel() {
    const runId = snapshot?.run.id;
    setState((s) => runId ? resetRunLevel(s, runId) : resetCurrentLevel(s));
  }

  function handleMarkCell(cell: CellCoord) {
    setState((s) => markCurrentLevel(s, cell));
  }

  function handleExplodeCell(cell: CellCoord) {
    setState((s) => failCurrentLevel(s, cell));
  }

  function handleClearData() {
    setState(clearPersistedGameState());
    navigateTo("home", setRoute);
  }

  function handleSettingsChange(nextSettings: GameSettings) {
    setState((s) => ({ ...s, settings: nextSettings }));
  }

  if (route === "game") {
    return (
      <main className="relative flex min-h-dvh flex-col bg-black text-zinc-100">
        {celebratingLevel !== null && (
          <LevelCompleteOverlay levelNumber={celebratingLevel.levelNumber} score={celebratingLevel.score} />
        )}
        {snapshot ? (
          <>
            <GameHeader
              levelNumber={snapshot.currentLevel.levelNumber}
              mineCount={snapshot.currentLevel.config.mineCount}
              markedCount={snapshot.currentLevel.markedCells.filter((cell) => containsCell(snapshot.currentLevel.mines, cell)).length}
              wrongMarkCount={snapshot.currentLevel.markedCells.filter((cell) => !containsCell(snapshot.currentLevel.mines, cell)).length}
              runStatus={snapshot.run.status}
              proximityIntensity={state.settings.visualFallbackEnabled && snapshot.run.status === "active" ? proximityIntensity : null}
              onBack={handleCloseGame}
              onResetLevel={handleResetLevel}
            />
            <BoardShell
              settings={state.settings}
              level={snapshot.currentLevel}
              showGestureHint={!gestureHintDismissed}
              onDismissGestureHint={handleDismissGestureHint}
              onExplodeCell={handleExplodeCell}
              onMarkCell={handleMarkCell}
              onProximityChange={setProximityIntensity}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <p className="text-zinc-400">No active run.</p>
            <div className="flex gap-3">
              <button
                className="rounded border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
                type="button"
                onClick={handleCloseGame}
              >
                Back
              </button>
              <button
                className="rounded bg-emerald-400 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
                type="button"
                onClick={handleStartRun}
              >
                New run
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (route === "settings") {
    return (
      <SettingsScreen
        settings={state.settings}
        onChange={handleSettingsChange}
        onBack={handleCloseSettings}
        onClearData={handleClearData}
      />
    );
  }

  return (
    <HomeScreen
      snapshot={snapshot}
      stats={stats}
      confirmingNewRun={confirmingNewRun}
      onStartRun={handleStartRun}
      onOpenGame={snapshot ? handleOpenGame : undefined}
      onOpenSettings={handleOpenSettings}
    />
  );
}

function HomeScreen({
  snapshot,
  stats,
  confirmingNewRun,
  onStartRun,
  onOpenGame,
  onOpenSettings,
}: {
  snapshot: ReturnType<typeof getSelectedRunSnapshot>;
  stats: ReturnType<typeof getPlayerStats>;
  confirmingNewRun: boolean;
  onStartRun: () => void;
  onOpenGame?: () => void;
  onOpenSettings: () => void;
}) {
  const hasRun = snapshot !== null;
  const isActive = snapshot?.run.status === "active";
  const isFailed = snapshot?.run.status === "failed";

  return (
    <main className="flex min-h-dvh flex-col bg-[#050505] text-zinc-100">
      <nav className="flex items-center justify-end px-5 pt-5">
        <button
          className="rounded border border-zinc-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          type="button"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="w-full max-w-xs text-center">
          {isFailed ? (
            <>
              <div className="relative mx-auto mb-4 h-52 w-52">
                <img
                  alt=""
                  className="h-full w-full object-contain opacity-40 drop-shadow-[0_0_24px_rgba(220,60,30,0.4)]"
                  src={EXPLOSION_ASSET_URL}
                />
              </div>
              <p className="text-5xl font-bold tabular-nums text-zinc-300">
                {snapshot!.currentLevel.levelNumber}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-red-400">
                Run ended
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <button
                  className="w-full rounded bg-emerald-400 py-3 text-sm font-semibold text-black hover:bg-emerald-300"
                  type="button"
                  onClick={onStartRun}
                >
                  Try again
                </button>
                {onOpenGame && (
                  <button
                    className="w-full rounded border border-zinc-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    type="button"
                    onClick={onOpenGame}
                  >
                    View board
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <img
                alt="BlindSweeper"
                className="mx-auto h-56 w-56 rounded-full brightness-125 drop-shadow-[0_0_40px_rgba(220,130,30,0.55)]"
                src={assetUrl("images/app-icon.png")}
              />
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                Feel your way.
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Explore the minefield without seeing it.
              </p>

              {hasRun && (
                <div className="mt-8 grid grid-cols-3 gap-2">
                  <StatCard
                    label="Level"
                    value={snapshot!.currentLevel.levelNumber}
                    highlight={isActive}
                  />
                  <StatCard label="Best" value={stats.highestLevelCompleted} />
                  <StatCard label="Explosions" value={stats.explosions} />
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3">
                {onOpenGame && isActive && (
                  <button
                    className="w-full rounded border border-emerald-500/60 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/10"
                    type="button"
                    onClick={onOpenGame}
                  >
                    Resume run
                  </button>
                )}
                {confirmingNewRun && isActive ? (
                  <button
                    className="w-full rounded border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
                    type="button"
                    onClick={onStartRun}
                  >
                    Confirm new run
                  </button>
                ) : (
                  <button
                    className="w-full rounded bg-emerald-400 py-3 text-sm font-semibold text-black hover:bg-emerald-300"
                    type="button"
                    onClick={onStartRun}
                  >
                    New run
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="pointer-events-none px-2 py-3">
      <p className={["text-2xl font-bold tabular-nums", highlight ? "text-emerald-300" : "text-white"].join(" ")}>
        {value}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function SettingsScreen({
  settings,
  onChange,
  onBack,
  onClearData,
}: {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onBack: () => void;
  onClearData: () => void;
}) {
  return (
    <main className="min-h-dvh bg-[#050505] text-zinc-100">
      <header className="flex items-center gap-3 border-b border-zinc-800/70 px-5 py-4">
        <button
          className="rounded border border-zinc-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          type="button"
          onClick={onBack}
        >
          Back
        </button>
        <h1 className="text-base font-semibold">Settings</h1>
      </header>

      <div className="mx-auto max-w-sm px-5 py-6">
        <div className="space-y-2">
          <SettingToggle
            checked={settings.hapticsEnabled}
            label="Haptics"
            description="Vibrate on proximity"
            onChange={(checked) => onChange({ ...settings, hapticsEnabled: checked })}
          />
          <SettingToggle
            checked={settings.audioEnabled}
            label="Audio"
            description="Sound effects and proximity tones"
            onChange={(checked) => onChange({ ...settings, audioEnabled: checked })}
          />
          <SettingToggle
            checked={settings.visualFallbackEnabled}
            label="Visual feedback"
            description="Color and meter while dragging"
            onChange={(checked) => onChange({ ...settings, visualFallbackEnabled: checked })}
          />
          {import.meta.env.DEV && (
            <SettingToggle
              checked={settings.debugReveal}
              label="Reveal mines"
              description="Show mine positions (debug)"
              onChange={(checked) => onChange({ ...settings, debugReveal: checked })}
            />
          )}
        </div>

        <div className="mt-10 border-t border-zinc-800/70 pt-6">
          <button
            className="w-full rounded border border-red-900/60 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-950/30"
            type="button"
            onClick={onClearData}
          >
            Reset all data
          </button>
        </div>
      </div>
    </main>
  );
}

function SettingToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm">
      <div>
        <span className="font-semibold text-zinc-100">{label}</span>
        <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>
      </div>
      <input
        checked={checked}
        className="h-4 w-4 accent-emerald-400"
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function GameHeader({
  levelNumber,
  mineCount,
  markedCount,
  wrongMarkCount,
  runStatus,
  proximityIntensity,
  onBack,
  onResetLevel,
}: {
  levelNumber: number;
  mineCount: number;
  markedCount: number;
  wrongMarkCount: number;
  runStatus: string;
  proximityIntensity: number | null;
  onBack: () => void;
  onResetLevel: () => void;
}) {
  const failed = runStatus === "failed";

  return (
    <header className="flex items-center justify-between gap-2 border-b border-zinc-800/70 bg-[#090909] px-4 py-3">
      <button
        className="rounded border border-zinc-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        type="button"
        onClick={onBack}
      >
        Back
      </button>

      <div className="flex items-center gap-3 text-sm">
        <span className={["font-semibold tabular-nums", failed ? "text-red-400" : "text-emerald-300"].join(" ")}>
          Lv {levelNumber}
        </span>
        {!failed && (
          <span className="text-zinc-500">
            {markedCount}/{mineCount} mines
            {wrongMarkCount > 0 && (
              <span className="ml-1.5 text-red-500/70">+{wrongMarkCount}</span>
            )}
          </span>
        )}
        {proximityIntensity !== null && (
          <ProximityMeter intensity={proximityIntensity} />
        )}
      </div>

      <button
        className="rounded border border-zinc-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        type="button"
        onClick={onResetLevel}
      >
        Restart
      </button>
    </header>
  );
}

function BoardShell({
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
  const lastFeedbackAtRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [proximityIntensity, setProximityIntensity] = useState(0);
  const [hoverCell, setHoverCell] = useState<CellCoord | null>(null);
  const active = level.status === "active";

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
    pointerStartRef.current = {
      point,
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

    const cell = eventCell(event, point, level);
    const duration = event.timeStamp - start.startedAt;
    const tapped = start.maxMovement <= TAP_MOVEMENT_THRESHOLD_PX && duration <= TAP_DURATION_THRESHOLD_MS;
    if (tapped && !containsCell(level.markedCells, cell)) {
      playSoundEffect("mark", settings.audioEnabled);
      onMarkCell(cell);
    }
  }

  function handlePointerCancel() {
    pointerStartRef.current = null;
    updateProximity(0);
    setHoverCell(null);
  }

  function handlePointerProbe(event: PointerEvent<HTMLDivElement>, point: BoardPoint, allowCollision: boolean) {
    const board = eventBoard(event);
    const cell = pointToCell(point, board, level.config);
    const collision = resolveDragCollision(cell, level.mines, level.markedCells);
    if (allowCollision && collision.exploded && collision.cell) {
      pointerStartRef.current = null;
      setHoverCell(collision.cell);
      updateProximity(1);
      runFeedback(1, settings, audioContextRef, lastFeedbackAtRef, true);
      onExplodeCell(collision.cell);
      return;
    }

    const proximity = computeProximity(point, board, level.config, level.mines, level.markedCells);
    setHoverCell(cell);
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
        {hoverCell && settings.visualFallbackEnabled && active && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute flex items-center justify-center transition-all duration-75"
            style={cellSlotStyle(hoverCell, level.config)}
          >
            <div className="aspect-square w-full max-h-full rounded-full bg-white/[0.06]" />
          </div>
        )}
        {level.explosionCell && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute flex items-center justify-center"
            style={cellSlotStyle(level.explosionCell, level.config)}
          >
            <div className="relative flex aspect-square w-full max-h-full items-center justify-center">
              <div className="absolute -inset-[20%] rounded-full bg-red-950/60" />
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

function ProximityMeter({ intensity }: { intensity: number }) {
  const activeBars = Math.round(intensity * 5);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex items-end gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((bar) => (
        <span
          className={[
            "block w-1.5 rounded-sm transition-colors duration-75",
            bar <= activeBars ? "bg-emerald-300" : "bg-zinc-700",
          ].join(" ")}
          key={bar}
          style={{ height: `${4 + bar * 3}px` }}
        />
      ))}
    </div>
  );
}

function LevelCompleteOverlay({ levelNumber, score }: { levelNumber: number; score: number }) {
  const perfect = score === 100;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/70">
      <img
        alt=""
        className="h-52 w-52 object-contain drop-shadow-[0_0_48px_rgba(52,211,153,0.6)]"
        src={LEVEL_COMPLETE_ASSET_URL}
      />
      <div className="text-center">
        <p className="text-6xl font-bold tabular-nums text-emerald-300">{levelNumber}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Cleared</p>
        <p className={["mt-3 text-2xl font-bold tabular-nums", perfect ? "text-yellow-300" : "text-emerald-200"].join(" ")}>
          {score}%
        </p>
        {perfect && (
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500">Perfect</p>
        )}
      </div>
    </div>
  );
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

function eventCell(event: PointerEvent<HTMLDivElement>, point: BoardPoint, level: LevelState): CellCoord {
  return pointToCell(point, eventBoard(event), level.config);
}

function distancePx(a: BoardPoint, b: BoardPoint): number {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return Math.sqrt(x * x + y * y);
}

function runFeedback(
  intensity: number,
  settings: GameSettings,
  audioContextRef: MutableRefObject<AudioContext | null>,
  lastFeedbackAtRef: MutableRefObject<number>,
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

function playFeedbackTone(
  intensity: number,
  audioContextRef: MutableRefObject<AudioContext | null>,
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

function getSharedAudioContext(): AudioContext | null {
  const Ctor = window.AudioContext;
  if (!Ctor) {
    return null; 
  }
  if (!sharedAudioContext) {
    sharedAudioContext = new Ctor();
  }
  return sharedAudioContext;
}

function playNote(ctx: AudioContext, freq: number, type: OscillatorType, gainValue: number, startAt: number, duration: number): void {
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

type SoundEffect = "mark" | "level-complete" | "level-complete-perfect";

function playSoundEffect(type: SoundEffect, audioEnabled: boolean): void {
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

function computeLevelScore(level: LevelState): number {
  if (level.markedCells.length === 0) {
    return 0; 
  }
  return Math.round((level.config.mineCount / level.markedCells.length) * 100);
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

function routeFromPath(pathname: string): AppRoute {
  if (pathname.endsWith("/game")) {
    return "game";
  }
  if (pathname.endsWith("/settings")) {
    return "settings";
  }
  return "home";
}

function navigateTo(route: AppRoute, setRoute: (route: AppRoute) => void): void {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const suffix = route === "game" ? "/game" : route === "settings" ? "/settings" : "/";
  const nextPath = `${basePath}${suffix}`;
  if (window.location.pathname !== nextPath) {
    window.history.pushState({}, "", nextPath);
  }
  setRoute(route);
}

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, "/");
}
