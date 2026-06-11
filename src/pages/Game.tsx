import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/useGameStore.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { GameCanvas } from '../components/GameCanvas.js';
import { HitButtons } from '../components/HitButtons.js';
import { GameHUD } from '../components/GameHUD.js';
import type { Difficulty } from '../../shared/types.js';

export default function Game() {
  const { songId, difficulty } = useParams<{ songId: string; difficulty: string }>();
  const navigate = useNavigate();
  const { startGame, status, gameResult, resetGame } = useGameStore();
  const { isConnected } = useWebSocket();
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 700 });

  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth * 0.9, 600);
      const maxHeight = Math.min(window.innerHeight * 0.7, 800);
      setCanvasSize({ width: maxWidth, height: maxHeight });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (isConnected && songId && difficulty) {
      startGame(songId, difficulty as Difficulty);
    }

    return () => {
      resetGame();
    };
  }, [isConnected, songId, difficulty, startGame, resetGame]);

  useEffect(() => {
    if (status === 'ended' && gameResult) {
      const sessionId = useGameStore.getState().sessionId;
      navigate(`/result/${sessionId}`);
    }
  }, [status, gameResult, navigate]);

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1f] via-[#0d0d2b] to-[#1a0a2e] flex flex-col items-center justify-center p-4">
      {!isConnected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-lg flex items-center gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <span>Reconnecting to server...</span>
        </div>
      )}

      {status === 'idle' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40">
          <div className="text-center">
            <div
              className="text-4xl font-bold text-white mb-4 animate-pulse"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              LOADING...
            </div>
            <p className="text-gray-400">Generating notes for {songId}</p>
          </div>
        </div>
      )}

      <div className="relative">
        <GameCanvas width={canvasSize.width} height={canvasSize.height} />
        <GameHUD />
      </div>

      <HitButtons />

      <button
        onClick={handleBack}
        className="mt-6 px-6 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition-colors border border-gray-600"
      >
        ← Back to Song Selection
      </button>
    </div>
  );
}
