import { LEVEL_COMPLETE_ASSET_URL } from "../lib/assets";

export function LevelCompleteOverlay({
  levelNumber,
  score,
  bestScore,
  onNextLevel,
  onImprove,
}: {
  levelNumber: number;
  score: number;
  bestScore: number;
  onNextLevel: () => void;
  onImprove: () => void;
}) {
  const perfect = score === 100;
  const isNewBest = score >= bestScore;
  const hadPriorAttempt = bestScore > 0 && !isNewBest;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 px-6">
      <img
        alt=""
        className="h-40 w-40 object-contain drop-shadow-[0_0_48px_rgba(52,211,153,0.6)]"
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
        {!perfect && isNewBest && bestScore > 0 && (
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">New best</p>
        )}
        {hadPriorAttempt && (
          <p className="mt-1 text-xs text-zinc-500">
            Your best: <span className="text-zinc-300">{bestScore}%</span>
          </p>
        )}
      </div>

      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        <button
          className="w-full rounded bg-emerald-400 py-3 text-sm font-semibold text-black hover:bg-emerald-300"
          type="button"
          onClick={onNextLevel}
        >
          Next level
        </button>
        {!perfect && (
          <button
            className="w-full rounded border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
            type="button"
            onClick={onImprove}
          >
            Improve score
          </button>
        )}
      </div>
    </div>
  );
}
