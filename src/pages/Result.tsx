import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/useGameStore.js';
import { Crown, Star, Zap, Target, RotateCcw, Home, ChevronRight, Unlock, Trophy } from 'lucide-react';
import { GRADE_COLORS, JUDGEMENT_COLORS } from '../utils/judgementColors.js';
import type { GameResult } from '../../shared/types.js';

export default function Result() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { gameResult, newHighScore, unlockedSongs, songs, resetGame } = useGameStore();
  const [result, setResult] = useState<GameResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResult = async () => {
      if (gameResult) {
        setResult(gameResult);
        setLoading(false);
        return;
      }

      if (sessionId) {
        try {
          const res = await fetch(`/api/game/result/${sessionId}`);
          const data = await res.json();
          if (data.success) {
            setResult(data.result);
          }
        } catch (error) {
          console.error('Failed to load result:', error);
        }
      }
      setLoading(false);
    };

    loadResult();
  }, [sessionId, gameResult]);

  useEffect(() => {
    return () => {
      resetGame();
    };
  }, [resetGame]);

  const currentSong = songs.find(s => s.id === result?.songId);

  const formatNumber = (n: number) => n.toLocaleString();

  const StatBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-bold">{value}</span>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-1000 rounded-full"
          style={{
            width: `${max > 0 ? (value / max) * 100 : 0}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a1f] via-[#0d0d2b] to-[#1a0a2e] flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          LOADING RESULT...
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a1f] via-[#0d0d2b] to-[#1a0a2e] flex flex-col items-center justify-center p-8">
        <div className="text-white text-xl mb-4">No result found</div>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors"
        >
          <Home className="w-5 h-5 inline mr-2" />
          Back to Home
        </button>
      </div>
    );
  }

  const totalNotes = result.perfectCount + result.greatCount + result.goodCount + result.missCount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1f] via-[#0d0d2b] to-[#1a0a2e] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-purple-500/30 overflow-hidden"
          style={{ boxShadow: '0 0 60px rgba(139, 0, 255, 0.2)' }}
        >
          {newHighScore && (
            <div className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 py-2 text-center text-black font-bold flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              NEW HIGH SCORE!
              <Trophy className="w-5 h-5" />
            </div>
          )}

          <div className="p-8">
            <div className="text-center mb-8">
              {currentSong && (
                <p className="text-gray-400 mb-2">{currentSong.name} - {result.difficulty.toUpperCase()}</p>
              )}

              <div
                className="text-9xl font-bold mb-4"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: GRADE_COLORS[result.grade],
                  textShadow: `0 0 40px ${GRADE_COLORS[result.grade]}, 0 0 80px ${GRADE_COLORS[result.grade]}`,
                }}
              >
                {result.grade}
              </div>

              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {formatNumber(result.score)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-black/30 rounded-xl p-4 text-center border border-cyan-500/30">
                <Target className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
                <div className="text-2xl font-bold text-cyan-400">{result.accuracy.toFixed(2)}%</div>
                <div className="text-xs text-gray-400 uppercase">Accuracy</div>
              </div>
              <div className="bg-black/30 rounded-xl p-4 text-center border border-yellow-500/30">
                <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-yellow-400">{result.maxCombo}</div>
                <div className="text-xs text-gray-400 uppercase">Max Combo</div>
              </div>
              <div className="bg-black/30 rounded-xl p-4 text-center border border-purple-500/30">
                <Star className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold text-purple-400">
                  {result.grade === 'S' ? '10' : result.grade === 'A' ? '8' : result.grade === 'B' ? '6' : result.grade === 'C' ? '4' : '0'}
                </div>
                <div className="text-xs text-gray-400 uppercase">Stars Earned</div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 text-gray-300">NOTE BREAKDOWN</h3>
              <StatBar label="PERFECT" value={result.perfectCount} max={totalNotes} color={JUDGEMENT_COLORS.perfect} />
              <StatBar label="GREAT" value={result.greatCount} max={totalNotes} color={JUDGEMENT_COLORS.great} />
              <StatBar label="GOOD" value={result.goodCount} max={totalNotes} color={JUDGEMENT_COLORS.good} />
              <StatBar label="MISS" value={result.missCount} max={totalNotes} color={JUDGEMENT_COLORS.miss} />
            </div>

            {unlockedSongs && unlockedSongs.length > 0 && (
              <div className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-green-400 mb-3">
                  <Unlock className="w-5 h-5" />
                  <span className="font-bold">NEW SONGS UNLOCKED!</span>
                </div>
                <div className="space-y-2">
                  {unlockedSongs.map(songId => {
                    const song = songs.find(s => s.id === songId);
                    return (
                      <div key={songId} className="flex items-center gap-2 text-white">
                        <ChevronRight className="w-4 h-4 text-green-400" />
                        <span>{song?.name || songId}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Song Select
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
