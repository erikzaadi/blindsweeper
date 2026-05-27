import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { containsCell } from "./game/gameEngine";
import type {
  CellCoord,
  GameSettings,
  PersistedGameState,
} from "./types";
import {
  advanceToNextLevel,
  computeLevelScore,
  failCurrentLevel,
  getBestScoreForLevel,
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
import { playSoundEffect } from "./lib/audio";
import { GESTURE_HINT_KEY, HOWTO_SEEN_KEY } from "./lib/assets";
import { BoardShell } from "./components/BoardShell";
import { GameHeader } from "./components/GameHeader";
import { LevelCompleteOverlay } from "./components/LevelCompleteOverlay";
import { HomeScreen } from "./screens/HomeScreen";
import { HowToScreen } from "./screens/HowToScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import "./styles.css";

type AppRoute = "home" | "settings" | "game" | "howto";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
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
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem(HOWTO_SEEN_KEY) === "1",
  );
  const [confirmingNewRun, setConfirmingNewRun] = useState(false);
  const [proximityIntensity, setProximityIntensity] = useState(0);
  const prevLevelStatusRef = useRef<string | null>(null);

  const snapshot = useMemo(() => getSelectedRunSnapshot(state), [state]);
  const stats = useMemo(() => getPlayerStats(state, DEFAULT_PROFILE_ID), [state]);

  const levelJustCompleted =
    snapshot?.run.status === "active" && snapshot.currentLevel.status === "completed";

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
    const status = snapshot?.currentLevel.status ?? null;
    if (status === "completed" && prevLevelStatusRef.current === "active") {
      const score = computeLevelScore(snapshot!.currentLevel);
      playSoundEffect(score === 100 ? "level-complete-perfect" : "level-complete", state.settings.audioEnabled);
    }
    prevLevelStatusRef.current = status;
  }, [snapshot?.currentLevel.status, snapshot?.currentLevel.id, snapshot, state.settings.audioEnabled]);

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

  function handleOpenHowTo() {
    navigateTo("howto", setRoute);
  }

  function handleCloseHowTo() {
    navigateTo("home", setRoute);
  }

  function handleDismissOnboarding() {
    localStorage.setItem(HOWTO_SEEN_KEY, "1");
    setOnboardingDismissed(true);
  }

  function handleResetLevel() {
    const runId = snapshot?.run.id;
    setState((s) => runId ? resetRunLevel(s, runId) : resetCurrentLevel(s));
  }

  function handleAdvanceLevel() {
    setState((s) => advanceToNextLevel(s));
  }

  function handleImproveLevel() {
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
        {levelJustCompleted && snapshot && (
          <LevelCompleteOverlay
            levelNumber={snapshot.currentLevel.levelNumber}
            score={computeLevelScore(snapshot.currentLevel)}
            bestScore={getBestScoreForLevel(state, snapshot.currentLevel.levelNumber, DEFAULT_PROFILE_ID)}
            onNextLevel={handleAdvanceLevel}
            onImprove={handleImproveLevel}
          />
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

  if (route === "howto") {
    return <HowToScreen onBack={handleCloseHowTo} />;
  }

  return (
    <HomeScreen
      snapshot={snapshot}
      stats={stats}
      confirmingNewRun={confirmingNewRun}
      showOnboarding={!onboardingDismissed && snapshot === null}
      onStartRun={handleStartRun}
      onOpenGame={snapshot ? handleOpenGame : undefined}
      onOpenSettings={handleOpenSettings}
      onOpenHowTo={handleOpenHowTo}
      onDismissOnboarding={handleDismissOnboarding}
    />
  );
}

function routeFromPath(pathname: string): AppRoute {
  if (pathname.endsWith("/game")) {
    return "game";
  }
  if (pathname.endsWith("/settings")) {
    return "settings";
  }
  if (pathname.endsWith("/howto")) {
    return "howto";
  }
  return "home";
}

function navigateTo(route: AppRoute, setRoute: (route: AppRoute) => void): void {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const suffix =
    route === "game" ? "/game" :
      route === "settings" ? "/settings" :
        route === "howto" ? "/howto" :
          "/";
  const nextPath = `${basePath}${suffix}`;
  if (window.location.pathname !== nextPath) {
    window.history.pushState({}, "", nextPath);
  }
  setRoute(route);
}
