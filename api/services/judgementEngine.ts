import type { Judgement, JudgementConfig } from '../../shared/types.js';

export const JUDGEMENT_CONFIG: JudgementConfig = {
  perfect: 50,
  great: 100,
  good: 150,
  miss: 200,
};

export interface JudgementResult {
  judgement: Judgement;
  timeDifference: number;
}

export function judgeNote(
  hitTime: number,
  actualHitTime: number,
  config: JudgementConfig = JUDGEMENT_CONFIG
): JudgementResult {
  const timeDiff = Math.abs(actualHitTime - hitTime);

  let judgement: Judgement;
  if (timeDiff <= config.perfect) {
    judgement = 'perfect';
  } else if (timeDiff <= config.great) {
    judgement = 'great';
  } else if (timeDiff <= config.good) {
    judgement = 'good';
  } else {
    judgement = 'miss';
  }

  return {
    judgement,
    timeDifference: actualHitTime - hitTime,
  };
}

export function findNearestNote(
  track: number,
  currentTime: number,
  pendingNotes: Array<{ id: string; track: number; hitTime: number; type: string }>,
  config: JudgementConfig = JUDGEMENT_CONFIG
): { id: string; hitTime: number; index: number } | null {
  const trackNotes = pendingNotes
    .map((note, index) => ({ ...note, originalIndex: index }))
    .filter(note => note.track === track);

  if (trackNotes.length === 0) return null;

  let nearestNote: typeof trackNotes[0] | null = null;
  let minDiff = Infinity;

  for (const note of trackNotes) {
    const diff = Math.abs(note.hitTime - currentTime);
    if (diff <= config.miss && diff < minDiff) {
      minDiff = diff;
      nearestNote = note;
    }
  }

  if (!nearestNote) return null;

  return {
    id: nearestNote.id,
    hitTime: nearestNote.hitTime,
    index: nearestNote.originalIndex,
  };
}

export function checkMissedNotes(
  currentTime: number,
  pendingNotes: Array<{ id: string; hitTime: number }>,
  config: JudgementConfig = JUDGEMENT_CONFIG
): string[] {
  const missedIds: string[] = [];

  for (const note of pendingNotes) {
    if (currentTime - note.hitTime > config.miss) {
      missedIds.push(note.id);
    }
  }

  return missedIds;
}

export function calculateAccuracy(
  perfectCount: number,
  greatCount: number,
  goodCount: number,
  missCount: number
): number {
  const totalNotes = perfectCount + greatCount + goodCount + missCount;
  if (totalNotes === 0) return 0;

  const weightedScore = perfectCount * 100 + greatCount * 80 + goodCount * 50 + missCount * 0;
  const maxScore = totalNotes * 100;

  return Math.round((weightedScore / maxScore) * 10000) / 100;
}

export function calculateGrade(accuracy: number, missRate: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (accuracy >= 95 && missRate <= 0.02) return 'S';
  if (accuracy >= 90) return 'A';
  if (accuracy >= 80) return 'B';
  if (accuracy >= 70) return 'C';
  return 'D';
}

export const JUDGEMENT_COLORS: Record<Judgement, string> = {
  perfect: '#ffd700',
  great: '#00ff88',
  good: '#00aaff',
  miss: '#ff4444',
};

export const JUDGEMENT_SCORES: Record<Judgement, number> = {
  perfect: 300,
  great: 200,
  good: 100,
  miss: 0,
};
