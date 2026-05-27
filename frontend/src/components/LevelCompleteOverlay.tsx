import { LEVEL_COMPLETE_ASSET_URL } from "../lib/assets";

export function LevelCompleteOverlay({ levelNumber, score }: { levelNumber: number; score: number }) {
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
