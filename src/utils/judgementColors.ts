import type { Judgement } from '../../shared/types.js';

export const JUDGEMENT_COLORS: Record<Judgement, string> = {
  perfect: '#ffd700',
  great: '#00ff88',
  good: '#00aaff',
  miss: '#ff4444',
};

export const JUDGEMENT_LABELS: Record<Judgement, string> = {
  perfect: 'PERFECT',
  great: 'GREAT',
  good: 'GOOD',
  miss: 'MISS',
};

export const GRADE_COLORS: Record<string, string> = {
  S: '#ffd700',
  A: '#ff6b6b',
  B: '#4ecdc4',
  C: '#45b7d1',
  D: '#96ceb4',
};

export const TRACK_COLORS = [
  '#ff00ff',
  '#00ffff',
  '#ffff00',
  '#ff6600',
];

export const NEON_GLOW = {
  pink: '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff',
  cyan: '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff',
  yellow: '0 0 10px #ffff00, 0 0 20px #ffff00, 0 0 30px #ffff00',
  orange: '0 0 10px #ff6600, 0 0 20px #ff6600, 0 0 30px #ff6600',
  gold: '0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 30px #ffd700',
};

export function getTrackGlow(track: number): string {
  const glows = [NEON_GLOW.pink, NEON_GLOW.cyan, NEON_GLOW.yellow, NEON_GLOW.orange];
  return glows[track % glows.length];
}
