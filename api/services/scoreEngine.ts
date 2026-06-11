import type { Judgement, ScoreConfig } from '../../shared/types.js';
import { JUDGEMENT_SCORES } from './judgementEngine.js';

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  perfect: 300,
  great: 200,
  good: 100,
  miss: 0,
  comboMultiplier: 0.1,
};

export interface ScoreResult {
  baseScore: number;
  comboBonus: number;
  totalScore: number;
}

export function calculateScore(
  judgement: Judgement,
  combo: number,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG
): ScoreResult {
  const baseScore = JUDGEMENT_SCORES[judgement];
  const comboMultiplier = 1 + Math.min(combo * config.comboMultiplier, 2);
  const comboBonus = Math.floor(baseScore * (comboMultiplier - 1));
  const totalScore = Math.floor(baseScore * comboMultiplier);

  return {
    baseScore,
    comboBonus,
    totalScore,
  };
}

export function calculateHoldScore(
  judgement: Judgement,
  holdDuration: number,
  combo: number,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG
): ScoreResult {
  const baseResult = calculateScore(judgement, combo, config);
  const holdBonus = Math.floor(holdDuration / 100) * 10;
  return {
    ...baseResult,
    totalScore: baseResult.totalScore + holdBonus,
  };
}

export function calculateHealthChange(
  judgement: Judgement,
  consecutiveMisses: number
): number {
  switch (judgement) {
    case 'perfect':
      return 1;
    case 'great':
      return 0.5;
    case 'good':
      return 0;
    case 'miss':
      return -10 - consecutiveMisses * 2;
    default:
      return 0;
  }
}

export function calculateComboChange(judgement: Judgement): number {
  return judgement === 'miss' ? 0 : 1;
}

export interface FinalScore {
  totalScore: number;
  accuracy: number;
  maxCombo: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
}

export function calculateFinalScore(
  perfectCount: number,
  greatCount: number,
  goodCount: number,
  missCount: number,
  maxCombo: number,
  rawScore: number
): FinalScore {
  const totalNotes = perfectCount + greatCount + goodCount + missCount;
  const weightedAccuracy = (perfectCount * 100 + greatCount * 80 + goodCount * 50) / (totalNotes * 100);
  const accuracy = Math.round(weightedAccuracy * 10000) / 100;
  const missRate = missCount / totalNotes;

  let grade: 'S' | 'A' | 'B' | 'C' | 'D';
  if (accuracy >= 95 && missRate <= 0.02) {
    grade = 'S';
  } else if (accuracy >= 90) {
    grade = 'A';
  } else if (accuracy >= 80) {
    grade = 'B';
  } else if (accuracy >= 70) {
    grade = 'C';
  } else {
    grade = 'D';
  }

  const comboBonus = maxCombo * 10;
  const totalScore = rawScore + comboBonus;

  return {
    totalScore: Math.min(totalScore, 9999999),
    accuracy,
    maxCombo,
    grade,
    perfectCount,
    greatCount,
    goodCount,
    missCount,
  };
}
