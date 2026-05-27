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

export function GameHeader({
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
