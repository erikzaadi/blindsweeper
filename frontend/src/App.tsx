import "./styles.css";

export function App() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">BlindSweeper</p>
        <h1 className="text-4xl font-semibold">Feel your way through the minefield.</h1>
        <p className="max-w-xl text-base text-zinc-300">
          Phase 1 scaffold is ready. Gameplay, profiles, persistence, and haptics land in later phases.
        </p>
      </section>
    </main>
  );
}
