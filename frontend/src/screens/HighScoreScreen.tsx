import { useEffect, useState } from "react";
import type { LevelHighScore } from "../lib/gameState";

function ScoreBar({ score }: { score: number }) {
  const color =
    score === 100
      ? "bg-emerald-400"
      : score >= 75
        ? "bg-emerald-600"
        : score >= 50
          ? "bg-yellow-600"
          : "bg-zinc-600";

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function ScoreRow({
  entry,
  onPlay,
}: {
  entry: LevelHighScore;
  onPlay?: (levelNumber: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const isFrontier = entry.bestScore === null;
  const isPerfect = entry.bestScore === 100;

  const scoreColor = isPerfect
    ? "text-emerald-300"
    : (entry.bestScore ?? 0) >= 75
      ? "text-emerald-500"
      : (entry.bestScore ?? 0) >= 50
        ? "text-yellow-500"
        : "text-zinc-400";

  useEffect(() => {
    if (!confirming) {
      return;
    }
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);

  function handlePlayClick() {
    if (isFrontier || confirming) {
      onPlay?.(entry.levelNumber);
    } else {
      setConfirming(true);
    }
  }

  return (
    <div className={`flex items-center gap-3 rounded border px-4 py-3 ${
      isFrontier ? "border-zinc-700/40 bg-zinc-900/20" : "border-zinc-800/60 bg-zinc-900/30"
    }`}>
      <span className="w-8 shrink-0 text-xs font-bold tabular-nums text-zinc-500">
        {String(entry.levelNumber).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        {isFrontier ? (
          <p className="text-xs text-zinc-600">not yet cleared</p>
        ) : (
          <ScoreBar score={entry.bestScore!} />
        )}
      </div>
      {!isFrontier && (
        <div className="flex shrink-0 items-baseline gap-1">
          <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>
            {entry.bestScore}
          </span>
          <span className="text-xs text-zinc-600">%</span>
        </div>
      )}
      <span className={`shrink-0 text-right text-xs text-zinc-600 ${isFrontier ? "w-auto" : "w-14"}`}>
        {entry.mineCount} mines
      </span>
      {onPlay && !isPerfect && (
        <button
          className={`shrink-0 rounded border px-2 py-1 text-xs font-semibold ${
            confirming
              ? "border-amber-700/60 text-amber-400 hover:border-amber-500"
              : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          }`}
          type="button"
          onClick={handlePlayClick}
        >
          {confirming ? "Sure?" : "Play"}
        </button>
      )}
      {onPlay && isPerfect && (
        <span className="w-[42px] shrink-0" />
      )}
    </div>
  );
}

export function HighScoreScreen({
  scores,
  onBack,
  onPlayLevel,
  onResumeRun,
}: {
  scores: LevelHighScore[];
  onBack: () => void;
  onPlayLevel?: (levelNumber: number) => void;
  onResumeRun?: () => void;
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
        <h1 className="flex-1 text-base font-semibold">High scores</h1>
        {onResumeRun && (
          <button
            className="rounded border border-emerald-700/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400 hover:border-emerald-500 hover:text-emerald-300"
            type="button"
            onClick={onResumeRun}
          >
            Resume run
          </button>
        )}
      </header>

      <div className="mx-auto max-w-sm px-5 py-6">
        {scores.length === 0 ? (
          <p className="text-center text-sm text-zinc-600">
            Complete a level to see your scores here.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-zinc-600">
              <span>Level</span>
              <span>Best score</span>
            </div>
            {scores.map((entry) => (
              <ScoreRow key={entry.levelNumber} entry={entry} onPlay={onPlayLevel} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
