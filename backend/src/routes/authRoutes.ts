import { Router } from 'express';
import { login, refresh, logout, changePassword, getProfile } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
