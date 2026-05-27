import { EXPLOSION_ASSET_URL, MARK_ASSET_URL, MARK_CONFIRMED_ASSET_URL } from "../lib/assets";

function HowToStep({
  number,
  title,
  body,
  accent,
  image,
}: {
  number: number;
  title: string;
  body: string;
  accent: "emerald" | "red" | "zinc";
  image?: string;
}) {
  const accentClasses = {
    emerald: "border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-400",
    red: "border-red-900/60 bg-red-950/20 text-red-400",
    zinc: "border-zinc-700/60 bg-zinc-900/40 text-zinc-400",
  } as const;

  const numberClasses = {
    emerald: "text-emerald-400",
    red: "text-red-400",
    zinc: "text-zinc-500",
  } as const;

  return (
    <div className={`rounded border px-4 py-3.5 ${accentClasses[accent]}`}>
      <div className="flex items-center gap-3">
        <span className={`shrink-0 self-start mt-0.5 text-xs font-bold tabular-nums ${numberClasses[accent]}`}>
          {String(number).padStart(2, "0")}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-zinc-100">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{body}</p>
        </div>
        {image && (
          <img
            alt=""
            className="h-10 w-10 shrink-0 object-contain opacity-90"
            src={image}
          />
        )}
      </div>
    </div>
  );
}

export function HowToScreen({ onBack }: { onBack: () => void }) {
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
        <h1 className="text-base font-semibold">How to play</h1>
      </header>

      <div className="mx-auto max-w-sm px-5 py-6 space-y-3">
        <HowToStep
          number={1}
          title="Drag to sense mines"
          body="Slowly drag your finger across the board. As you approach a mine, the sound pitch rises, haptics intensify, and the board glows green."
          accent="emerald"
        />
        <HowToStep
          number={2}
          title="Tap to mark a mine"
          body="Tap any cell to place a marker where you think a mine is. Markers cannot be removed, so place them carefully."
          accent="zinc"
          image={MARK_ASSET_URL}
        />
        <HowToStep
          number={3}
          title="Confirmed marks glow"
          body="A marker placed exactly on a mine lights up bright. Use this feedback to verify your guesses as you go."
          accent="emerald"
          image={MARK_CONFIRMED_ASSET_URL}
        />
        <HowToStep
          number={4}
          title="Numbers show proximity"
          body="Each marker shows a number from 1 to 9. The higher the number, the closer the marker is to a mine. A 9 means the marker is confirmed: it is sitting exactly on a mine."
          accent="emerald"
        />
        <HowToStep
          number={5}
          title="Mark every mine to advance"
          body="Once all mines have a marker on them, the level completes and the next, harder level begins."
          accent="emerald"
        />
        <HowToStep
          number={6}
          title="Score: accuracy matters"
          body="Each level scores you on accuracy: mines marked divided by total markers placed, as a percentage. Place a marker on every mine and nothing else to score 100%."
          accent="zinc"
        />
        <HowToStep
          number={7}
          title="One explosion ends the run"
          body="Dragging your finger across an unmarked mine triggers an explosion. Your run ends immediately - marked mines are safe to cross."
          accent="red"
          image={EXPLOSION_ASSET_URL}
        />
      </div>
    </main>
  );
}
