import { useGameStore } from '../stores/useGameStore.js';
import { Pause, Play, X, Heart, Zap, Target } from 'lucide-react';

export function GameHUD() {
  const {
    score,
    combo,
    health,
    accuracy,
    currentTime,
    duration,
    status,
    maxCombo,
    pauseGame,
    resumeGame,
    quitGame,
  } = useGameStore();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatScore = (s: number) => {
    return s.toString().padStart(8, '0');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
            <Heart className="w-5 h-5 text-red-500" fill={health > 30 ? 'currentColor' : '#ff0000'} />
            <div className="w-32 h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-200 rounded-full"
                style={{
                  width: `${health}%`,
                  backgroundColor: health > 50 ? '#00ff88' : health > 25 ? '#ffaa00' : '#ff4444',
                  boxShadow: health > 50 ? '0 0 10px #00ff88' : health > 25 ? '0 0 10px #ffaa00' : '0 0 10px #ff4444',
                }}
              />
            </div>
            <span className="text-white font-bold text-sm min-w-[40px]">{Math.floor(health)}</span>
          </div>

          <div className="bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 text-cyan-400">
              <Target className="w-4 h-4" />
              <span className="text-sm">Accuracy</span>
            </div>
            <span className="text-white font-bold text-xl">{accuracy.toFixed(2)}%</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-black/50 px-6 py-3 rounded-lg backdrop-blur-sm text-center">
            <div className="text-gray-400 text-xs uppercase tracking-wider">Score</div>
            <div
              className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {formatScore(score)}
            </div>
          </div>

          {combo > 0 && (
            <div
              className="mt-2 text-center animate-pulse"
              style={{
                transform: `scale(${1 + Math.min(combo * 0.01, 0.3)})`,
                transition: 'transform 0.1s',
              }}
            >
              <div className="flex items-center gap-1 text-yellow-400">
                <Zap className="w-5 h-5" fill="currentColor" />
                <span
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    textShadow: '0 0 10px #ffd700',
                  }}
                >
                  {combo}
                </span>
              </div>
              <div className="text-yellow-300 text-xs uppercase tracking-wider">Combo</div>
            </div>
          )}

          <div className="mt-2 text-gray-400 text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex gap-2">
            {status === 'playing' ? (
              <button
                onClick={pauseGame}
                className="bg-black/50 p-3 rounded-lg backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                <Pause className="w-5 h-5 text-white" />
              </button>
            ) : status === 'paused' ? (
              <button
                onClick={resumeGame}
                className="bg-green-500/50 p-3 rounded-lg backdrop-blur-sm hover:bg-green-500/70 transition-colors"
              >
                <Play className="w-5 h-5 text-white" />
              </button>
            ) : null}
            <button
              onClick={quitGame}
              className="bg-red-500/50 p-3 rounded-lg backdrop-blur-sm hover:bg-red-500/70 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm text-right">
            <div className="text-gray-400 text-xs uppercase tracking-wider">Max Combo</div>
            <div className="text-white font-bold">{maxCombo}</div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {status === 'paused' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto">
          <div className="text-center">
            <h2
              className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              PAUSED
            </h2>
            <p className="text-gray-400 mb-6">Press PLAY to continue or X to quit</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={resumeGame}
                className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
              >
                Continue
              </button>
              <button
                onClick={quitGame}
                className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
