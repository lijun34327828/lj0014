import type { Request, Response } from 'express';
import { getAllSongs, getUserProgress } from '../db/repositories.js';
import { sanitizeString } from '../middleware/security.js';

export const getSongs = (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'default_user';
    const sanitizedUserId = sanitizeString(userId, 100);
    const songs = getAllSongs(sanitizedUserId);

    res.status(200).json({
      success: true,
      songs,
    });
  } catch (error) {
    console.error('[SongController] Error getting songs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get songs',
    });
  }
};

export const getProgress = (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'default_user';
    const sanitizedUserId = sanitizeString(userId, 100);
    const progress = getUserProgress(sanitizedUserId);

    res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('[SongController] Error getting progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user progress',
    });
  }
};
