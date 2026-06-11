import { Router } from 'express';
import { getSongs, getProgress } from '../controllers/songController.js';
import { rateLimiter } from '../middleware/security.js';

const router = Router();

router.get('/', rateLimiter, getSongs);
router.get('/progress', rateLimiter, getProgress);

export default router;
