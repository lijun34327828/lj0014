export type Judgement = 'perfect' | 'great' | 'good' | 'miss';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';
export type NoteType = 'tap' | 'hold' | 'slide';
export type SpecialMode = 'speedUp' | 'hidden' | 'shuffle';

export interface Note {
  id: string;
  track: number;
  spawnTime: number;
  hitTime: number;
  type: NoteType;
  duration?: number;
  isHidden?: boolean;
  speedMultiplier?: number;
}

export interface GameStateUpdate {
  status: GameStatus;
  score: number;
  combo: number;
  maxCombo: number;
  health: number;
  accuracy: number;
  currentTime: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
}

export interface GameResult {
  songId: string;
  difficulty: Difficulty;
  score: number;
  accuracy: number;
  maxCombo: number;
  grade: Grade;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
}

export interface SongDifficultyConfig {
  level: Difficulty;
  stars: number;
  speed: number;
  specialModes?: SpecialMode[];
  unlockRequirement: number;
  unlocked: boolean;
}

export interface Song {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  duration: number;
  audioFile?: string;
  difficulties: SongDifficultyConfig[];
  highScore: number;
  highAccuracy: number;
}

export interface UserProgress {
  userId: string;
  name: string;
  totalStars: number;
  maxCombo: number;
  unlockedSongs: string[];
  highScores: Record<string, number>;
}

export type ClientMessage =
  | { type: 'GAME_START'; songId: string; difficulty: Difficulty; userId: string }
  | { type: 'NOTE_HIT'; track: number; timestamp: number; noteId?: string }
  | { type: 'GAME_PAUSE' }
  | { type: 'GAME_RESUME' }
  | { type: 'GAME_QUIT' }
  | { type: 'HEARTBEAT'; timestamp: number };

export type ServerMessage =
  | { type: 'GAME_READY'; sessionId: string; notes: Note[]; bpm: number; duration: number }
  | { type: 'NOTE_SPAWN'; note: Note }
  | { type: 'JUDGEMENT_RESULT'; noteId: string; judgement: Judgement; score: number; combo: number; health: number }
  | { type: 'STATE_UPDATE'; state: GameStateUpdate }
  | { type: 'GAME_END'; result: GameResult; newHighScore: boolean; unlockedSongs?: string[] }
  | { type: 'HEARTBEAT_ACK'; timestamp: number }
  | { type: 'ERROR'; message: string; code: number };

export interface JudgementConfig {
  perfect: number;
  great: number;
  good: number;
  miss: number;
}

export interface ScoreConfig {
  perfect: number;
  great: number;
  good: number;
  miss: number;
  comboMultiplier: number;
}

export interface GameSession {
  id: string;
  userId: string;
  songId: string;
  difficulty: Difficulty;
  status: GameStatus;
  score: number;
  combo: number;
  maxCombo: number;
  health: number;
  maxHealth: number;
  notes: Note[];
  hitNotes: Map<string, Judgement>;
  pendingNotes: Note[];
  startTime: number;
  pauseTime: number;
  currentTime: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  lastHitTime: number;
  consecutiveMisses: number;
}
