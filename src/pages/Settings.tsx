import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, Music, Zap, Eye, Trash2, Info } from 'lucide-react';

interface Settings {
  musicVolume: number;
  sfxVolume: number;
  noteSpeed: number;
  showJudgement: boolean;
  showCombo: boolean;
  darkMode: boolean;
  enableParticles: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  musicVolume: 80,
  sfxVolume: 100,
  noteSpeed: 100,
  showJudgement: true,
  showCombo: true,
  darkMode: true,
  enableParticles: true,
};

const STORAGE_KEY = 'rhythm_master_settings';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse settings');
      }
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    setShowResetConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const SettingSlider = ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    icon,
    unit = '%',
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    icon: React.ReactNode;
    unit?: string;
  }) => (
    <div className="bg-black/30 rounded-xl p-5 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-bold text-white">{label}</span>
        </div>
        <span className="text-cyan-400 font-mono font-bold">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );

  const SettingToggle = ({
    label,
    description,
    checked,
    onChange,
    icon,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    icon: React.ReactNode;
  }) => (
    <div className="bg-black/30 rounded-xl p-5 border border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {icon}
        <div>
          <div className="font-bold text-white">{label}</div>
          <div className="text-sm text-gray-400">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`
          relative w-14 h-7 rounded-full transition-colors duration-300
          ${checked ? 'bg-cyan-500' : 'bg-gray-600'}
        `}
      >
        <div
          className={`
            absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-lg
            ${checked ? 'translate-x-8' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1f] via-[#0d0d2b] to-[#1a0a2e] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                SETTINGS
              </h1>
              <p className="text-gray-400 text-sm">Customize your gameplay experience</p>
            </div>
          </div>
          {saved && (
            <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg animate-pulse">
              ✓ Saved!
            </div>
          )}
        </header>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              <Music className="w-5 h-5 text-purple-400" />
              AUDIO
            </h2>
            <div className="space-y-4">
              <SettingSlider
                label="Music Volume"
                value={settings.musicVolume}
                onChange={(v) => setSettings({ ...settings, musicVolume: v })}
                icon={<Volume2 className="w-5 h-5 text-purple-400" />}
              />
              <SettingSlider
                label="SFX Volume"
                value={settings.sfxVolume}
                onChange={(v) => setSettings({ ...settings, sfxVolume: v })}
                icon={<VolumeX className="w-5 h-5 text-purple-400" />}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              <Zap className="w-5 h-5 text-cyan-400" />
              GAMEPLAY
            </h2>
            <div className="space-y-4">
              <SettingSlider
                label="Note Speed"
                value={settings.noteSpeed}
                onChange={(v) => setSettings({ ...settings, noteSpeed: v })}
                min={50}
                max={200}
                icon={<Zap className="w-5 h-5 text-cyan-400" />}
              />
              <SettingToggle
                label="Show Judgement"
                description="Display Perfect/Great/Good/Miss feedback"
                checked={settings.showJudgement}
                onChange={(v) => setSettings({ ...settings, showJudgement: v })}
                icon={<Eye className="w-5 h-5 text-cyan-400" />}
              />
              <SettingToggle
                label="Show Combo Counter"
                description="Display current combo during gameplay"
                checked={settings.showCombo}
                onChange={(v) => setSettings({ ...settings, showCombo: v })}
                icon={<Zap className="w-5 h-5 text-cyan-400" />}
              />
              <SettingToggle
                label="Particle Effects"
                description="Enable hit effects and visual feedback"
                checked={settings.enableParticles}
                onChange={(v) => setSettings({ ...settings, enableParticles: v })}
                icon={<Zap className="w-5 h-5 text-cyan-400" />}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              <Info className="w-5 h-5 text-yellow-400" />
              ABOUT
            </h2>
            <div className="bg-black/30 rounded-xl p-5 border border-gray-700">
              <div className="space-y-2 text-sm text-gray-400">
                <p><span className="text-white font-bold">Game:</span> Rhythm Master</p>
                <p><span className="text-white font-bold">Version:</span> 1.0.0</p>
                <p><span className="text-white font-bold">Controls:</span> D / F / J / K or Touch</p>
                <p><span className="text-white font-bold">Judgement Windows:</span></p>
                <ul className="ml-6 space-y-1">
                  <li><span className="text-cyan-400">Perfect:</span> ±50ms</li>
                  <li><span className="text-green-400">Great:</span> ±100ms</li>
                  <li><span className="text-yellow-400">Good:</span> ±150ms</li>
                  <li><span className="text-red-400">Miss:</span> {'>'}150ms</li>
                </ul>
              </div>
            </div>
          </section>

          <div className="flex gap-4">
            <button
              onClick={saveSettings}
              className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              SAVE SETTINGS
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-6 py-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-xl transition-all border border-red-500/50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-red-500/30">
            <h3 className="text-xl font-bold text-red-400 mb-4">Reset Settings?</h3>
            <p className="text-gray-400 mb-6">This will reset all settings to their default values. This action cannot be undone.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={resetSettings}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
