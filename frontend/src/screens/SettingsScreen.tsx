import type { GameSettings } from "../types";

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

export function SettingsScreen({
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
