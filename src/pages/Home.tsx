import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/useGameStore.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import type { Song, Difficulty } from '../../shared/types.js';
import { Star, Lock, Music, Zap, Crown, Settings } from 'lucide-react';
import { GRADE_COLORS } from '../utils/judgementColors.js';

export default function Home() {
  const navigate = useNavigate();
  const { songs, userProgress, setSongs, setUserProgress } = useGameStore();
  const { isConnected } = useWebSocket();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [songsRes, progressRes] = await Promise.all([
          fetch('/api/songs?userId=default_user'),
          fetch('/api/songs/progress?userId=default_user'),
        ]);

        const songsData = await songsRes.json();
        const progressData = await progressRes.json();

        if (songsData.success) {
          setSongs(songsData.songs);
        }
        if (progressData.success) {
          setUserProgress(progressData.progress);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [setSongs, setUserProgress]);

  const handleStartGame = (difficulty: Difficulty) => {
    if (!selectedSong) return;
    navigate(`/game/${selectedSong.id}/${difficulty}`);
  };

  const renderStars = (count: number, max: number = 10) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a1f] via-[#0d0d2b] to-[#1a0a2e] flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          LOADING...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1f] via-[#0d0d2b] to-[#1a0a2e] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1
              className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              RHYTHM MASTER
            </h1>
            <p className="text-gray-400 mt-2">Feel the beat, master the rhythm</p>
          </div>
          <div className="flex items-center gap-4">
            {userProgress && (
              <div className="bg-black/30 px-6 py-3 rounded-lg backdrop-blur-sm border border-purple-500/30">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="font-bold">{userProgress.totalStars}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-600" />
                  <div className="flex items-center gap-1">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <span className="font-bold">{userProgress.maxCombo}</span>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => navigate('/settings')}
              className="p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors border border-gray-700"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex items-center gap-2 mb-4">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Connected to server' : 'Reconnecting...'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              SELECT SONG
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {songs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => {
                    const hasUnlocked = song.difficulties.some(d => d.unlocked);
                    if (hasUnlocked) {
                      setSelectedSong(song);
                    }
                  }}
                  className={`
                    relative p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer
                    ${selectedSong?.id === song.id
                      ? 'border-purple-500 bg-purple-500/20 scale-[1.02]'
                      : song.difficulties.some(d => d.unlocked)
                        ? 'border-gray-700 bg-black/30 hover:border-purple-500/50 hover:bg-black/50'
                        : 'border-gray-800 bg-black/20 opacity-50 cursor-not-allowed'
                    }
                  `}
                  style={{
                    boxShadow: selectedSong?.id === song.id
                      ? '0 0 30px rgba(139, 0, 255, 0.3)'
                      : 'none',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Music className="w-5 h-5 text-purple-400" />
                        <h3 className="font-bold text-lg">{song.name}</h3>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{song.artist}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>BPM: {song.bpm}</span>
                        <span>{Math.floor(song.duration / 1000)}s</span>
                      </div>
                    </div>
                    {!song.difficulties.some(d => d.unlocked) && (
                      <Lock className="w-6 h-6 text-gray-500" />
                    )}
                    {song.highScore > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Best</div>
                        <div className="font-bold text-cyan-400">{song.highScore.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="flex flex-wrap gap-2">
                      {song.difficulties.map((diff) => (
                        <div
                          key={diff.level}
                          className={`
                            px-2 py-1 rounded text-xs font-bold
                            ${diff.unlocked
                              ? diff.level === 'easy'
                                ? 'bg-green-500/20 text-green-400'
                                : diff.level === 'normal'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : diff.level === 'hard'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-red-500/20 text-red-400'
                              : 'bg-gray-700/50 text-gray-500'
                            }
                          `}
                        >
                          {diff.level.toUpperCase()} {diff.stars}★
                          {diff.specialModes && diff.specialModes.length > 0 && (
                            <span className="ml-1 opacity-70">
                              [{diff.specialModes.map(m => m[0].toUpperCase()).join('')}]
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              DIFFICULTY
            </h2>
            {selectedSong ? (
              <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-xl font-bold mb-2">{selectedSong.name}</h3>
                <p className="text-gray-400 mb-6">{selectedSong.artist}</p>

                <div className="space-y-3">
                  {selectedSong.difficulties.filter(d => d.unlocked).map((diff) => (
                    <button
                      key={diff.level}
                      onClick={() => handleStartGame(diff.level)}
                      className={`
                        w-full p-4 rounded-lg text-left transition-all duration-200
                        hover:scale-[1.02]
                        ${diff.level === 'easy'
                          ? 'bg-green-500/20 border-2 border-green-500/50 hover:bg-green-500/30 hover:border-green-500'
                          : diff.level === 'normal'
                            ? 'bg-blue-500/20 border-2 border-blue-500/50 hover:bg-blue-500/30 hover:border-blue-500'
                            : diff.level === 'hard'
                              ? 'bg-orange-500/20 border-2 border-orange-500/50 hover:bg-orange-500/30 hover:border-orange-500'
                              : 'bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/30 hover:border-red-500'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold uppercase">{diff.level}</div>
                          <div className="text-sm opacity-70">Speed: {diff.speed}x</div>
                        </div>
                        {renderStars(diff.stars, 10)}
                      </div>
                      {diff.specialModes && diff.specialModes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {diff.specialModes.map((mode) => (
                            <span
                              key={mode}
                              className="text-xs px-2 py-0.5 bg-black/30 rounded"
                            >
                              {mode === 'speedUp' ? '⚡ SPEED UP' : mode === 'hidden' ? '👻 HIDDEN' : '🔀 SHUFFLE'}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {selectedSong.highScore > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">Best Performance</div>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-3xl font-bold text-cyan-400">
                          {selectedSong.highScore.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">
                          Accuracy: {selectedSong.highAccuracy.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-black/30 rounded-xl p-8 border border-gray-700 text-center">
                <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Select a song to view difficulties</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 p-6 bg-black/30 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold mb-4">HOW TO PLAY</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-2 bg-pink-500/20 border border-pink-500 rounded font-bold text-pink-400">D</kbd>
              <span>Track 1</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-2 bg-cyan-500/20 border border-cyan-500 rounded font-bold text-cyan-400">F</kbd>
              <span>Track 2</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-2 bg-yellow-500/20 border border-yellow-500 rounded font-bold text-yellow-400">J</kbd>
              <span>Track 3</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-2 bg-orange-500/20 border border-orange-500 rounded font-bold text-orange-400">K</kbd>
              <span>Track 4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
