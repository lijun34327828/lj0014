import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 1000;
const MAX_HIT_RATE = 30;
const HIT_WINDOW = 1000;

const hitTimestamps = new Map<string, number[]>();

const VALID_TRACKS = [0, 1, 2, 3];
const VALID_DIFFICULTIES = ['easy', 'normal', 'hard', 'expert'];
const MAX_SCORE = 10000000;
const MAX_HEALTH = 100;
const MIN_TIMESTAMP = 0;
const MAX_TIMESTAMP = 7200000;

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    next();
    return;
  }

  if (entry.count >= RATE_LIMIT) {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.'
    });
    return;
  }

  entry.count++;
  next();
}

export function hitRateLimiter(userId: string, timestamp: number): boolean {
  const now = Date.now();
  const key = userId;
  let timestamps = hitTimestamps.get(key) || [];

  timestamps = timestamps.filter(t => now - t < HIT_WINDOW);
  timestamps.push(timestamp);

  if (timestamps.length > MAX_HIT_RATE) {
    return false;
  }

  hitTimestamps.set(key, timestamps);
  return true;
}

export function validateNoteHit(track: number, timestamp: number, noteId?: string): { valid: boolean; error?: string } {
  if (!VALID_TRACKS.includes(track)) {
    return { valid: false, error: `Invalid track: ${track}. Must be one of ${VALID_TRACKS.join(', ')}` };
  }

  if (typeof timestamp !== 'number' || timestamp < MIN_TIMESTAMP || timestamp > MAX_TIMESTAMP) {
    return { valid: false, error: `Invalid timestamp: ${timestamp}. Must be between ${MIN_TIMESTAMP} and ${MAX_TIMESTAMP}` };
  }

  if (noteId !== undefined && (typeof noteId !== 'string' || noteId.length === 0 || noteId.length > 100)) {
    return { valid: false, error: 'Invalid noteId format' };
  }

  return { valid: true };
}

export function validateGameStart(songId: string, difficulty: string, userId: string): { valid: boolean; error?: string } {
  if (!songId || typeof songId !== 'string' || songId.length === 0 || songId.length > 50) {
    return { valid: false, error: 'Invalid songId' };
  }

  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return { valid: false, error: `Invalid difficulty: ${difficulty}` };
  }

  if (!userId || typeof userId !== 'string' || userId.length === 0 || userId.length > 100) {
    return { valid: false, error: 'Invalid userId' };
  }

  return { valid: true };
}

export function validateScore(score: number): { valid: boolean; error?: string } {
  if (typeof score !== 'number' || score < 0 || score > MAX_SCORE) {
    return { valid: false, error: `Invalid score: ${score}. Must be between 0 and ${MAX_SCORE}` };
  }

  if (!Number.isInteger(score)) {
    return { valid: false, error: 'Score must be an integer' };
  }

  return { valid: true };
}

export function validateHealth(health: number): { valid: boolean; error?: string } {
  if (typeof health !== 'number' || health < 0 || health > MAX_HEALTH) {
    return { valid: false, error: `Invalid health: ${health}. Must be between 0 and ${MAX_HEALTH}` };
  }

  return { valid: true };
}

const VALID_MESSAGE_TYPES = ['GAME_START', 'NOTE_HIT', 'GAME_PAUSE', 'GAME_RESUME', 'GAME_QUIT', 'HEARTBEAT'];

export function validateMessageType(type: string): { valid: boolean; error?: string } {
  if (!VALID_MESSAGE_TYPES.includes(type)) {
    return { valid: false, error: `Invalid message type: ${type}` };
  }

  return { valid: true };
}

export function sanitizeString(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') return '';
  let sanitized = input.replace(/[<>]/g, '');
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  return sanitized.substring(0, maxLength);
}

export function validateGameSave(data: {
  songId: string;
  difficulty: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  grade: string;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
}): { valid: boolean; error?: string } {
  const songValidation = validateGameStart(data.songId, data.difficulty, 'temp');
  if (!songValidation.valid) {
    return songValidation;
  }

  const scoreValidation = validateScore(data.score);
  if (!scoreValidation.valid) {
    return scoreValidation;
  }

  if (typeof data.accuracy !== 'number' || data.accuracy < 0 || data.accuracy > 100) {
    return { valid: false, error: `Invalid accuracy: ${data.accuracy}` };
  }

  if (typeof data.maxCombo !== 'number' || data.maxCombo < 0 || data.maxCombo > 10000) {
    return { valid: false, error: `Invalid maxCombo: ${data.maxCombo}` };
  }

  const validGrades = ['S', 'A', 'B', 'C', 'D'];
  if (!validGrades.includes(data.grade)) {
    return { valid: false, error: `Invalid grade: ${data.grade}` };
  }

  const totalNotes = data.perfectCount + data.greatCount + data.goodCount + data.missCount;
  if (totalNotes <= 0 || totalNotes > 5000) {
    return { valid: false, error: `Invalid note counts` };
  }

  const calcAccuracy = ((data.perfectCount * 100 + data.greatCount * 80 + data.goodCount * 50) / (totalNotes * 100)) * 100;
  if (Math.abs(calcAccuracy - data.accuracy) > 1) {
    return { valid: false, error: 'Accuracy mismatch with note counts' };
  }

  return { valid: true };
}
