import type { Request, Response } from 'express';
import { saveGameResult, getUserProgress } from '../db/repositories.js';
import { validateGameSave, sanitizeString } from '../middleware/security.js';
import type { GameResult } from '../../shared/types.js';
import { reconnectSession, endGame, deleteSession } from '../services/gameStateMachine.js';

export const saveResult = (req: Request, res: Response) => {
  try {
    const {
      songId,
      difficulty,
      score,
      accuracy,
      maxCombo,
      grade,
      perfectCount,
      greatCount,
      goodCount,
      missCount,
      userId,
    } = req.body;

    const validation = validateGameSave({
      songId,
      difficulty,
      score,
      accuracy,
      maxCombo,
      grade,
      perfectCount,
      greatCount,
      goodCount,
      missCount,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const sanitizedUserId = sanitizeString(userId || 'default_user', 100);

    const result: GameResult = {
      songId: sanitizeString(songId, 50),
      difficulty: difficulty as GameResult['difficulty'],
      score: Math.floor(score),
      accuracy,
      maxCombo: Math.floor(maxCombo),
      grade: grade as GameResult['grade'],
      perfectCount: Math.floor(perfectCount),
      greatCount: Math.floor(greatCount),
      goodCount: Math.floor(goodCount),
      missCount: Math.floor(missCount),
    };

    const saveResult = saveGameResult(sanitizedUserId, result);

    res.status(200).json({
      success: saveResult.success,
      newHighScore: saveResult.newHighScore,
      unlockedSongs: saveResult.newUnlocks,
      earnedStars: saveResult.earnedStars,
    });
  } catch (error) {
    console.error('[GameController] Error saving result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save game result',
    });
  }
};

export const reconnect = (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid sessionId',
      });
    }

    const result = reconnectSession(sessionId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
      });
    }

    res.status(200).json({
      success: true,
      gameState: result.state,
      notes: result.notes,
      currentTime: result.state?.currentTime || 0,
    });
  } catch (error) {
    console.error('[GameController] Error reconnecting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reconnect',
    });
  }
};

export const getSessionResult = (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid sessionId',
      });
    }

    const result = endGame(sessionId);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    deleteSession(sessionId);

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[GameController] Error getting session result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session result',
    });
  }
};
