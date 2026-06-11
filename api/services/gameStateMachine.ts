import { v4 as uuidv4 } from 'uuid';
import type {
  GameSession,
  GameStatus,
  Note,
  Judgement,
  Difficulty,
  GameResult,
  GameStateUpdate,
  ServerMessage,
  SpecialMode,
} from '../../shared/types.js';
import { generateNotes } from './noteGenerator.js';
import { judgeNote, findNearestNote, checkMissedNotes, calculateAccuracy } from './judgementEngine.js';
import { calculateScore, calculateHealthChange, calculateComboChange, calculateFinalScore } from './scoreEngine.js';
import { getSongById, getSongDifficulty } from '../db/repositories.js';
import { hitRateLimiter, validateNoteHit } from '../middleware/security.js';

const sessions = new Map<string, GameSession>();
const MAX_HEALTH = 100;
const STATE_UPDATE_INTERVAL = 50;

export function createSession(
  userId: string,
  songId: string,
  difficulty: Difficulty
): { session: GameSession; notes: Note[] } | { error: string } {
  const song = getSongById(songId);
  if (!song) {
    return { error: 'Song not found' };
  }

  const diffConfig = getSongDifficulty(songId, difficulty);
  if (!diffConfig) {
    return { error: 'Difficulty config not found' };
  }

  const specialModes: SpecialMode[] = diffConfig.special_modes
    ? JSON.parse(diffConfig.special_modes)
    : [];

  const notes = generateNotes({
    bpm: song.bpm,
    duration: song.duration,
    difficulty,
    noteSpeed: diffConfig.note_speed,
    specialModes,
  });

  const sessionId = uuidv4();
  const now = Date.now();

  const session: GameSession = {
    id: sessionId,
    userId,
    songId,
    difficulty,
    status: 'idle',
    score: 0,
    combo: 0,
    maxCombo: 0,
    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    notes,
    hitNotes: new Map(),
    pendingNotes: [...notes],
    startTime: now,
    pauseTime: 0,
    currentTime: 0,
    perfectCount: 0,
    greatCount: 0,
    goodCount: 0,
    missCount: 0,
    lastHitTime: 0,
    consecutiveMisses: 0,
  };

  sessions.set(sessionId, session);

  setTimeout(() => {
    if (sessions.has(sessionId) && sessions.get(sessionId)!.status === 'idle') {
      sessions.get(sessionId)!.status = 'playing';
      sessions.get(sessionId)!.startTime = Date.now();
      startGameLoop(sessionId);
    }
  }, 100);

  return { session, notes };
}

export function getSession(sessionId: string): GameSession | undefined {
  return sessions.get(sessionId);
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function handleNoteHit(
  sessionId: string,
  track: number,
  timestamp: number,
  noteId?: string
): ServerMessage | { error: string } {
  const session = sessions.get(sessionId);
  if (!session) {
    return { error: 'Session not found' };
  }

  if (session.status !== 'playing') {
    return { error: `Game is not playing. Current status: ${session.status}` };
  }

  if (!hitRateLimiter(session.userId, timestamp)) {
    return { error: 'Hit rate limit exceeded' };
  }

  const validation = validateNoteHit(track, timestamp, noteId);
  if (!validation.valid) {
    return { error: validation.error || 'Invalid note hit' };
  }

  let targetNoteId = noteId;
  let targetNote: Note | undefined;

  if (!targetNoteId) {
    const nearest = findNearestNote(track, session.currentTime, session.pendingNotes);
    if (nearest) {
      targetNoteId = nearest.id;
      targetNote = session.pendingNotes.find(n => n.id === nearest.id);
    }
  } else {
    targetNote = session.pendingNotes.find(n => n.id === targetNoteId);
    if (!targetNote) {
      targetNote = session.notes.find(n => n.id === targetNoteId);
      if (targetNote && session.hitNotes.has(targetNoteId)) {
        return { error: 'Note already hit' };
      }
    }
  }

  if (!targetNote) {
    return {
      type: 'JUDGEMENT_RESULT',
      noteId: 'empty',
      judgement: 'miss',
      score: 0,
      combo: 0,
      health: session.health,
    };
  }

  const judgementResult = judgeNote(targetNote.hitTime, timestamp);
  return processJudgement(session, targetNote, judgementResult.judgement);
}

function processJudgement(
  session: GameSession,
  note: Note,
  judgement: Judgement
): ServerMessage {
  const scoreResult = calculateScore(judgement, session.combo);
  const healthChange = calculateHealthChange(judgement, session.consecutiveMisses);
  const comboChange = calculateComboChange(judgement);

  session.score += scoreResult.totalScore;
  session.health = Math.max(0, Math.min(MAX_HEALTH, session.health + healthChange));

  if (comboChange === 0) {
    session.combo = 0;
    session.consecutiveMisses++;
  } else {
    session.combo++;
    session.consecutiveMisses = 0;
  }

  session.maxCombo = Math.max(session.maxCombo, session.combo);

  session.hitNotes.set(note.id, judgement);
  session.pendingNotes = session.pendingNotes.filter(n => n.id !== note.id);

  switch (judgement) {
    case 'perfect':
      session.perfectCount++;
      break;
    case 'great':
      session.greatCount++;
      break;
    case 'good':
      session.goodCount++;
      break;
    case 'miss':
      session.missCount++;
      break;
  }

  session.lastHitTime = Date.now();

  return {
    type: 'JUDGEMENT_RESULT',
    noteId: note.id,
    judgement,
    score: scoreResult.totalScore,
    combo: session.combo,
    health: session.health,
  };
}

export function handlePause(sessionId: string): { success: boolean; error?: string } {
  const session = sessions.get(sessionId);
  if (!session) return { success: false, error: 'Session not found' };
  if (session.status !== 'playing') return { success: false, error: 'Game is not playing' };

  session.status = 'paused';
  session.pauseTime = Date.now();
  return { success: true };
}

export function handleResume(sessionId: string): { success: boolean; error?: string } {
  const session = sessions.get(sessionId);
  if (!session) return { success: false, error: 'Session not found' };
  if (session.status !== 'paused') return { success: false, error: 'Game is not paused' };

  const pauseDuration = Date.now() - session.pauseTime;
  session.startTime += pauseDuration;
  session.status = 'playing';
  return { success: true };
}

export function handleQuit(sessionId: string): { success: boolean; error?: string } {
  const session = sessions.get(sessionId);
  if (!session) return { success: false, error: 'Session not found' };

  session.status = 'ended';
  return { success: true };
}

function startGameLoop(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  let lastUpdate = Date.now();

  const loop = () => {
    const currentSession = sessions.get(sessionId);
    if (!currentSession || currentSession.status === 'ended') {
      return;
    }

    if (currentSession.status === 'paused') {
      lastUpdate = Date.now();
      setTimeout(loop, STATE_UPDATE_INTERVAL);
      return;
    }

    const now = Date.now();
    const delta = now - lastUpdate;
    lastUpdate = now;

    currentSession.currentTime += delta;

    const missedNoteIds = checkMissedNotes(currentSession.currentTime, currentSession.pendingNotes);
    for (const noteId of missedNoteIds) {
      const note = currentSession.notes.find(n => n.id === noteId);
      if (note) {
        processJudgement(currentSession, note, 'miss');
      }
    }

    if (currentSession.health <= 0) {
      endGame(sessionId);
      return;
    }

    const song = getSongById(currentSession.songId);
    if (song && currentSession.currentTime >= song.duration) {
      endGame(sessionId);
      return;
    }

    setTimeout(loop, STATE_UPDATE_INTERVAL);
  };

  loop();
}

export function endGame(sessionId: string): GameResult | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.status = 'ended';

  const finalResult = calculateFinalScore(
    session.perfectCount,
    session.greatCount,
    session.goodCount,
    session.missCount,
    session.maxCombo,
    session.score
  );

  const result: GameResult = {
    songId: session.songId,
    difficulty: session.difficulty,
    score: finalResult.totalScore,
    accuracy: finalResult.accuracy,
    maxCombo: finalResult.maxCombo,
    grade: finalResult.grade,
    perfectCount: finalResult.perfectCount,
    greatCount: finalResult.greatCount,
    goodCount: finalResult.goodCount,
    missCount: finalResult.missCount,
  };

  return result;
}

export function getStateUpdate(sessionId: string): GameStateUpdate | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const totalHit = session.perfectCount + session.greatCount + session.goodCount;
  const totalNotes = totalHit + session.missCount;
  const accuracy = calculateAccuracy(
    session.perfectCount,
    session.greatCount,
    session.goodCount,
    session.missCount
  );

  return {
    status: session.status,
    score: session.score,
    combo: session.combo,
    maxCombo: session.maxCombo,
    health: session.health,
    accuracy,
    currentTime: session.currentTime,
    perfectCount: session.perfectCount,
    greatCount: session.greatCount,
    goodCount: session.goodCount,
    missCount: session.missCount,
  };
}

export function reconnectSession(sessionId: string): {
  success: boolean;
  state?: GameStateUpdate;
  notes?: Note[];
  error?: string;
} {
  const session = sessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  if (session.status === 'ended') {
    return { success: false, error: 'Game already ended' };
  }

  const state = getStateUpdate(sessionId);
  return {
    success: true,
    state,
    notes: session.notes,
  };
}
