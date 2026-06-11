import db from './database.js';
import type { Song, Difficulty, UserProgress, GameResult, SpecialMode } from '../../shared/types.js';

interface DbSong {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  duration: number;
  audio_file: string | null;
}

interface DbDifficulty {
  id: string;
  song_id: string;
  difficulty: Difficulty;
  stars: number;
  note_speed: number;
  special_modes: string | null;
  unlock_requirement: number;
}

export function getAllSongs(userId: string = 'default_user'): Song[] {
  const songsStmt = db.prepare<[], DbSong>(`
    SELECT id, name, artist, bpm, duration, audio_file
    FROM songs
    ORDER BY id
  `);

  const difficultiesStmt = db.prepare<string, DbDifficulty>(`
    SELECT id, song_id, difficulty, stars, note_speed, special_modes, unlock_requirement
    FROM song_difficulties
    WHERE song_id = ?
    ORDER BY
      CASE difficulty
        WHEN 'easy' THEN 1
        WHEN 'normal' THEN 2
        WHEN 'hard' THEN 3
        WHEN 'expert' THEN 4
      END
  `);

  const unlockedStmt = db.prepare<[string, string], { unlocked: number }>(`
    SELECT 1 as unlocked FROM unlocked_songs
    WHERE user_id = ? AND song_id = ?
  `);

  const highScoreStmt = db.prepare<[string, string], { high_score: number; high_accuracy: number }>(`
    SELECT MAX(score) as high_score, MAX(accuracy) as high_accuracy
    FROM game_records
    WHERE user_id = ? AND song_id = ?
  `);

  const userProgress = getUserProgress(userId);
  const songs = songsStmt.all();

  return songs.map(song => {
    const difficulties = difficultiesStmt.all(song.id);
    const highScore = highScoreStmt.get(userId, song.id);

    return {
      id: song.id,
      name: song.name,
      artist: song.artist,
      bpm: song.bpm,
      duration: song.duration,
      audioFile: song.audio_file || undefined,
      difficulties: difficulties.map(diff => {
        const unlocked = unlockedStmt.get(userId, song.id) ? true : false;
        return {
          level: diff.difficulty,
          stars: diff.stars,
          speed: diff.note_speed,
          specialModes: diff.special_modes ? JSON.parse(diff.special_modes) as SpecialMode[] : undefined,
          unlockRequirement: diff.unlock_requirement,
          unlocked: unlocked && userProgress.totalStars >= diff.unlock_requirement,
        };
      }),
      highScore: highScore?.high_score || 0,
      highAccuracy: highScore?.high_accuracy || 0,
    };
  });
}

export function getSongById(songId: string): DbSong | undefined {
  const stmt = db.prepare<string, DbSong>(`
    SELECT id, name, artist, bpm, duration, audio_file
    FROM songs WHERE id = ?
  `);
  return stmt.get(songId);
}

export function getSongDifficulty(songId: string, difficulty: Difficulty): DbDifficulty | undefined {
  const stmt = db.prepare<[string, string], DbDifficulty>(`
    SELECT id, song_id, difficulty, stars, note_speed, special_modes, unlock_requirement
    FROM song_difficulties
    WHERE song_id = ? AND difficulty = ?
  `);
  return stmt.get(songId, difficulty);
}

export function getUserProgress(userId: string = 'default_user'): UserProgress {
  const userStmt = db.prepare<string, { id: string; name: string; total_stars: number; max_combo: number }>(`
    SELECT id, name, total_stars, max_combo
    FROM users WHERE id = ?
  `);

  const unlockedStmt = db.prepare<string, { song_id: string }>(`
    SELECT song_id FROM unlocked_songs WHERE user_id = ?
  `);

  const highScoresStmt = db.prepare<string, { song_id: string; max_score: number }>(`
    SELECT song_id, MAX(score) as max_score
    FROM game_records
    WHERE user_id = ?
    GROUP BY song_id
  `);

  const user = userStmt.get(userId);
  if (!user) {
    return {
      userId: 'default_user',
      name: 'Player 1',
      totalStars: 0,
      maxCombo: 0,
      unlockedSongs: ['song_001', 'song_002'],
      highScores: {},
    };
  }

  const unlockedSongs = unlockedStmt.all(userId).map(r => r.song_id);
  const highScores: Record<string, number> = {};
  highScoresStmt.all(userId).forEach(r => {
    highScores[r.song_id] = r.max_score;
  });

  return {
    userId: user.id,
    name: user.name,
    totalStars: user.total_stars,
    maxCombo: user.max_combo,
    unlockedSongs,
    highScores,
  };
}

export function saveGameResult(userId: string, result: GameResult): {
  success: boolean;
  newHighScore: boolean;
  newUnlocks: string[];
  earnedStars: number;
} {
  const tx = db.transaction(() => {
    const highScoreStmt = db.prepare<[string, string, string], { max_score: number }>(`
      SELECT MAX(score) as max_score
      FROM game_records
      WHERE user_id = ? AND song_id = ? AND difficulty = ?
    `);

    const prevHigh = highScoreStmt.get(userId, result.songId, result.difficulty);
    const newHighScore = !prevHigh || result.score > prevHigh.max_score;

    const insertStmt = db.prepare(`
      INSERT INTO game_records (id, user_id, song_id, difficulty, score, accuracy, max_combo, grade, perfect_count, great_count, good_count, miss_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      result.songId,
      result.difficulty,
      result.score,
      result.accuracy,
      result.maxCombo,
      result.grade,
      result.perfectCount,
      result.greatCount,
      result.goodCount,
      result.missCount
    );

    const diffConfig = getSongDifficulty(result.songId, result.difficulty);
    let earnedStars = 0;
    if (newHighScore && diffConfig) {
      const starThresholds = [
        { grade: 'S', stars: diffConfig.stars },
        { grade: 'A', stars: Math.ceil(diffConfig.stars * 0.8) },
        { grade: 'B', stars: Math.ceil(diffConfig.stars * 0.6) },
        { grade: 'C', stars: Math.ceil(diffConfig.stars * 0.4) },
        { grade: 'D', stars: 0 },
      ];
      earnedStars = starThresholds.find(t => t.grade === result.grade)?.stars || 0;

      if (earnedStars > 0) {
        const userUpdateStmt = db.prepare(`
          UPDATE users
          SET total_stars = total_stars + ?,
              max_combo = MAX(max_combo, ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        userUpdateStmt.run(earnedStars, result.maxCombo, userId);
      }
    }

    const userProgress = getUserProgress(userId);
    const allSongsStmt = db.prepare<[], { id: string; unlock_requirement: number }>(`
      SELECT s.id, MIN(sd.unlock_requirement) as unlock_requirement
      FROM songs s
      JOIN song_difficulties sd ON s.id = sd.song_id
      GROUP BY s.id
    `);

    const allSongs = allSongsStmt.all();
    const newUnlocks: string[] = [];

    for (const song of allSongs) {
      const alreadyUnlocked = userProgress.unlockedSongs.includes(song.id);
      if (!alreadyUnlocked && userProgress.totalStars + earnedStars >= song.unlock_requirement) {
        const unlockStmt = db.prepare(`
          INSERT OR IGNORE INTO unlocked_songs (id, user_id, song_id)
          VALUES (?, ?, ?)
        `);
        unlockStmt.run(
          `unlock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          song.id
        );
        newUnlocks.push(song.id);
      }
    }

    return {
      success: true,
      newHighScore,
      newUnlocks,
      earnedStars,
    };
  });

  try {
    return tx();
  } catch (error) {
    console.error('[Database] Error saving game result:', error);
    return { success: false, newHighScore: false, newUnlocks: [], earnedStars: 0 };
  }
}

export function isSongUnlocked(userId: string, songId: string): boolean {
  const stmt = db.prepare<[string, string], { count: number }>(`
    SELECT COUNT(*) as count FROM unlocked_songs
    WHERE user_id = ? AND song_id = ?
  `);
  const result = stmt.get(userId, songId);
  return result?.count ? result.count > 0 : false;
}
