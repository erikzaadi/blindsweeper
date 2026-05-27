import { assetUrl, EXPLOSION_ASSET_URL } from "../lib/assets";
import type { getPlayerStats, getSelectedRunSnapshot } from "../lib/gameState";

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

export function HomeScreen({
  snapshot,
  stats,
  confirmingNewRun,
  onStartRun,
  onOpenGame,
  onOpenSettings,
  onOpenHowTo,
}: {
  snapshot: ReturnType<typeof getSelectedRunSnapshot>;
  stats: ReturnType<typeof getPlayerStats>;
  confirmingNewRun: boolean;
  onStartRun: () => void;
  onOpenGame?: () => void;
  onOpenSettings: () => void;
  onOpenHowTo: () => void;
}) {
  const hasRun = snapshot !== null;
  const isActive = snapshot?.run.status === "active";
  const isFailed = snapshot?.run.status === "failed";

  return (
    <main className="flex min-h-dvh flex-col bg-[#050505] text-zinc-100">
      <nav className="flex items-center justify-between px-5 pt-5">
        <button
          className="rounded border border-zinc-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          type="button"
          onClick={onOpenHowTo}
        >
          How to play
        </button>
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
