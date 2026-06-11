import { Router } from 'express';
import { saveResult, reconnect, getSessionResult } from '../controllers/gameController.js';
import { rateLimiter } from '../middleware/security.js';

const router = Router();

router.post('/save', rateLimiter, saveResult);
router.post('/reconnect', rateLimiter, reconnect);
router.get('/result/:sessionId', rateLimiter, getSessionResult);

export default router;
