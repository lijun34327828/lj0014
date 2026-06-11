import { v4 as uuidv4 } from 'uuid';
import type { Note, Difficulty, SpecialMode, NoteType } from '../../shared/types.js';

const FALL_DURATION = 2000;

export interface NoteGeneratorConfig {
  bpm: number;
  duration: number;
  difficulty: Difficulty;
  noteSpeed: number;
  specialModes: SpecialMode[];
}

interface BeatPattern {
  probability: number;
  tracks: number[];
  type: NoteType;
}

const DIFFICULTY_CONFIG: Record<Difficulty, {
  noteDensity: number;
  patterns: BeatPattern[];
  holdChance: number;
  slideChance: number;
}> = {
  easy: {
    noteDensity: 0.3,
    patterns: [
      { probability: 0.6, tracks: [0], type: 'tap' },
      { probability: 0.25, tracks: [1], type: 'tap' },
      { probability: 0.1, tracks: [2], type: 'tap' },
      { probability: 0.05, tracks: [3], type: 'tap' },
    ],
    holdChance: 0,
    slideChance: 0,
  },
  normal: {
    noteDensity: 0.5,
    patterns: [
      { probability: 0.25, tracks: [0], type: 'tap' },
      { probability: 0.25, tracks: [1], type: 'tap' },
      { probability: 0.25, tracks: [2], type: 'tap' },
      { probability: 0.15, tracks: [3], type: 'tap' },
      { probability: 0.1, tracks: [0, 2], type: 'tap' },
    ],
    holdChance: 0.1,
    slideChance: 0,
  },
  hard: {
    noteDensity: 0.7,
    patterns: [
      { probability: 0.2, tracks: [0], type: 'tap' },
      { probability: 0.2, tracks: [1], type: 'tap' },
      { probability: 0.2, tracks: [2], type: 'tap' },
      { probability: 0.2, tracks: [3], type: 'tap' },
      { probability: 0.1, tracks: [0, 3], type: 'tap' },
      { probability: 0.07, tracks: [1, 2], type: 'tap' },
      { probability: 0.03, tracks: [0, 1, 2], type: 'tap' },
    ],
    holdChance: 0.2,
    slideChance: 0.1,
  },
  expert: {
    noteDensity: 0.9,
    patterns: [
      { probability: 0.15, tracks: [0], type: 'tap' },
      { probability: 0.15, tracks: [1], type: 'tap' },
      { probability: 0.15, tracks: [2], type: 'tap' },
      { probability: 0.15, tracks: [3], type: 'tap' },
      { probability: 0.12, tracks: [0, 3], type: 'tap' },
      { probability: 0.1, tracks: [1, 2], type: 'tap' },
      { probability: 0.08, tracks: [0, 1], type: 'tap' },
      { probability: 0.06, tracks: [2, 3], type: 'tap' },
      { probability: 0.04, tracks: [0, 2], type: 'tap' },
      { probability: 0.05, tracks: [1, 3], type: 'tap' },
    ],
    holdChance: 0.25,
    slideChance: 0.15,
  },
};

function selectPattern(patterns: BeatPattern[]): BeatPattern {
  const rand = Math.random();
  let cumulative = 0;
  for (const pattern of patterns) {
    cumulative += pattern.probability;
    if (rand <= cumulative) {
      return pattern;
    }
  }
  return patterns[0];
}

function shuffleTracks(tracks: number[]): number[] {
  const shuffled = [...tracks];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateNotes(config: NoteGeneratorConfig): Note[] {
  const { bpm, duration, difficulty, noteSpeed, specialModes } = config;
  const diffConfig = DIFFICULTY_CONFIG[difficulty];

  const beatInterval = 60000 / bpm;
  const subBeatDivisions = difficulty === 'expert' ? 4 : difficulty === 'hard' ? 4 : 2;
  const subBeatInterval = beatInterval / subBeatDivisions;

  const notes: Note[] = [];
  const totalBeats = Math.floor(duration / beatInterval);
  const hasSpeedUp = specialModes.includes('speedUp');
  const hasHidden = specialModes.includes('hidden');
  const hasShuffle = specialModes.includes('shuffle');

  let currentSpeedMultiplier = 1;
  const speedChangePoints: number[] = [];
  if (hasSpeedUp) {
    for (let i = 1; i <= 3; i++) {
      speedChangePoints.push((duration * i) / 4);
    }
  }

  for (let beat = 0; beat < totalBeats; beat++) {
    const beatTime = beat * beatInterval;

    for (let subBeat = 0; subBeat < subBeatDivisions; subBeat++) {
      const time = beatTime + subBeat * subBeatInterval;

      if (time + FALL_DURATION >= duration) continue;

      if (hasSpeedUp) {
        for (const point of speedChangePoints) {
          if (time >= point && currentSpeedMultiplier < 1 + speedChangePoints.indexOf(point) * 0.2) {
            currentSpeedMultiplier = 1 + (speedChangePoints.indexOf(point) + 1) * 0.2;
          }
        }
      }

      if (Math.random() > diffConfig.noteDensity) continue;

      const pattern = selectPattern(diffConfig.patterns);
      let tracks = hasShuffle ? shuffleTracks(pattern.tracks) : pattern.tracks;

      for (const track of tracks) {
        let noteType: NoteType = pattern.type;

        if (noteType === 'tap') {
          const rand = Math.random();
          if (rand < diffConfig.holdChance) {
            noteType = 'hold';
          } else if (rand < diffConfig.holdChance + diffConfig.slideChance) {
            noteType = 'slide';
          }
        }

        const effectiveSpeed = noteSpeed * currentSpeedMultiplier;
        const adjustedFallDuration = FALL_DURATION / effectiveSpeed;
        const spawnTime = time - adjustedFallDuration;

        if (spawnTime < 0) continue;

        const note: Note = {
          id: uuidv4(),
          track,
          spawnTime: Math.max(0, spawnTime),
          hitTime: time,
          type: noteType,
          isHidden: hasHidden && Math.random() < 0.3,
          speedMultiplier: effectiveSpeed,
        };

        if (noteType === 'hold') {
          note.duration = beatInterval * (1 + Math.floor(Math.random() * 2));
        }

        notes.push(note);
      }
    }
  }

  notes.sort((a, b) => a.hitTime - b.hitTime);
  console.log(`[NoteGenerator] Generated ${notes.length} notes for ${difficulty} difficulty`);

  return notes;
}

export function calculateNotePosition(hitTime: number, currentTime: number, noteSpeed: number, trackHeight: number): number {
  const fallDuration = FALL_DURATION / noteSpeed;
  const timeUntilHit = hitTime - currentTime;
  const progress = 1 - timeUntilHit / fallDuration;
  return trackHeight * (1 - progress);
}

export function getFallDuration(noteSpeed: number): number {
  return FALL_DURATION / noteSpeed;
}
