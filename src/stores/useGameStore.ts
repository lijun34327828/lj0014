import { create } from 'zustand';
import type {
  Note,
  GameStatus,
  Judgement,
  GameStateUpdate,
  GameResult,
  Song,
  UserProgress,
  Difficulty,
  ServerMessage,
} from '../../shared/types.js';

interface JudgementEffect {
  id: string;
  judgement: Judgement;
  track: number;
  timestamp: number;
}

interface GameState {
  status: GameStatus;
  sessionId: string;
  songId: string;
  difficulty: Difficulty;
  score: number;
  combo: number;
  maxCombo: number;
  health: number;
  accuracy: number;
  currentTime: number;
  duration: number;
  bpm: number;
  notes: Note[];
  hitNotes: Map<string, Judgement>;
  judgementEffects: JudgementEffect[];
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  gameResult: GameResult | null;
  newHighScore: boolean;
  unlockedSongs: string[];
  songs: Song[];
  userProgress: UserProgress | null;
  isConnected: boolean;
  ws: WebSocket | null;
  pendingSessionId: string | null;

  setWs: (ws: WebSocket | null) => void;
  setSongs: (songs: Song[]) => void;
  setUserProgress: (progress: UserProgress) => void;
  handleServerMessage: (message: ServerMessage) => void;
  startGame: (songId: string, difficulty: Difficulty) => void;
  hitNote: (track: number, noteId?: string) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  quitGame: () => void;
  addJudgementEffect: (track: number, judgement: Judgement) => void;
  clearJudgementEffects: () => void;
  resetGame: () => void;
  reconnect: (sessionId: string) => void;
}

const initialState = {
  status: 'idle' as GameStatus,
  sessionId: '',
  songId: '',
  difficulty: 'easy' as Difficulty,
  score: 0,
  combo: 0,
  maxCombo: 0,
  health: 100,
  accuracy: 0,
  currentTime: 0,
  duration: 0,
  bpm: 120,
  notes: [],
  hitNotes: new Map(),
  judgementEffects: [],
  perfectCount: 0,
  greatCount: 0,
  goodCount: 0,
  missCount: 0,
  gameResult: null,
  newHighScore: false,
  unlockedSongs: [],
  songs: [],
  userProgress: null,
  isConnected: false,
  ws: null,
  pendingSessionId: null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setWs: (ws) => set({ ws, isConnected: !!ws }),

  setSongs: (songs) => set({ songs }),

  setUserProgress: (progress) => set({ userProgress: progress }),

  handleServerMessage: (message) => {
    const state = get();

    switch (message.type) {
      case 'GAME_READY':
        set({
          status: 'playing',
          sessionId: message.sessionId,
          notes: message.notes,
          bpm: message.bpm,
          duration: message.duration,
          score: 0,
          combo: 0,
          maxCombo: 0,
          health: 100,
          currentTime: 0,
          hitNotes: new Map(),
          perfectCount: 0,
          greatCount: 0,
          goodCount: 0,
          missCount: 0,
          judgementEffects: [],
          gameResult: null,
        });
        if (state.pendingSessionId) {
          set({ pendingSessionId: null });
        }
        break;

      case 'JUDGEMENT_RESULT':
        if (message.judgement !== 'miss') {
          const note = state.notes.find(n => n.id === message.noteId);
          if (note) {
            get().addJudgementEffect(note.track, message.judgement);
          }
        }
        set((prev) => {
          const newHitNotes = new Map(prev.hitNotes);
          newHitNotes.set(message.noteId, message.judgement);

          const counts = {
            perfectCount: prev.perfectCount + (message.judgement === 'perfect' ? 1 : 0),
            greatCount: prev.greatCount + (message.judgement === 'great' ? 1 : 0),
            goodCount: prev.goodCount + (message.judgement === 'good' ? 1 : 0),
            missCount: prev.missCount + (message.judgement === 'miss' ? 1 : 0),
          };

          return {
            score: prev.score + message.score,
            combo: message.combo,
            maxCombo: Math.max(prev.maxCombo, message.combo),
            health: message.health,
            hitNotes: newHitNotes,
            ...counts,
          };
        });
        break;

      case 'STATE_UPDATE':
        set({
          status: message.state.status,
          score: message.state.score,
          combo: message.state.combo,
          maxCombo: message.state.maxCombo,
          health: message.state.health,
          accuracy: message.state.accuracy,
          currentTime: message.state.currentTime,
          perfectCount: message.state.perfectCount,
          greatCount: message.state.greatCount,
          goodCount: message.state.goodCount,
          missCount: message.state.missCount,
        });
        break;

      case 'GAME_END':
        set({
          status: 'ended',
          gameResult: message.result,
          newHighScore: message.newHighScore,
          unlockedSongs: message.unlockedSongs || [],
        });
        break;

      case 'ERROR':
        console.error('[GameStore] Server error:', message.message);
        break;

      case 'HEARTBEAT_ACK':
        break;
    }
  },

  startGame: (songId, difficulty) => {
    const state = get();
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
      console.error('[GameStore] WebSocket not connected');
      return;
    }

    set({ songId, difficulty, status: 'idle' });

    state.ws.send(JSON.stringify({
      type: 'GAME_START',
      songId,
      difficulty,
      userId: 'default_user',
    }));
  },

  hitNote: (track, noteId) => {
    const state = get();
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    if (state.status !== 'playing') return;

    state.ws.send(JSON.stringify({
      type: 'NOTE_HIT',
      track,
      timestamp: Date.now() - state.notes[0]?.spawnTime || 0,
      noteId,
    }));
  },

  pauseGame: () => {
    const state = get();
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

    state.ws.send(JSON.stringify({ type: 'GAME_PAUSE' }));
    set({ status: 'paused' });
  },

  resumeGame: () => {
    const state = get();
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

    state.ws.send(JSON.stringify({ type: 'GAME_RESUME' }));
    set({ status: 'playing' });
  },

  quitGame: () => {
    const state = get();
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

    state.ws.send(JSON.stringify({ type: 'GAME_QUIT' }));
    get().resetGame();
  },

  addJudgementEffect: (track, judgement) => {
    const effect: JudgementEffect = {
      id: `${Date.now()}-${track}`,
      judgement,
      track,
      timestamp: Date.now(),
    };
    set((prev) => ({
      judgementEffects: [...prev.judgementEffects, effect],
    }));
  },

  clearJudgementEffects: () => {
    const now = Date.now();
    set((prev) => ({
      judgementEffects: prev.judgementEffects.filter(
        (e) => now - e.timestamp < 500
      ),
    }));
  },

  resetGame: () => {
    set({
      status: 'idle',
      sessionId: '',
      songId: '',
      score: 0,
      combo: 0,
      maxCombo: 0,
      health: 100,
      accuracy: 0,
      currentTime: 0,
      notes: [],
      hitNotes: new Map(),
      judgementEffects: [],
      perfectCount: 0,
      greatCount: 0,
      goodCount: 0,
      missCount: 0,
      gameResult: null,
      newHighScore: false,
      unlockedSongs: [],
    });
  },

  reconnect: (sessionId) => {
    set({ pendingSessionId: sessionId });
  },
}));
