import { Router } from 'express';
import { login, refresh, logout, changePassword, getProfile, updateProfile, listUsers, createUser, updateUser } from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);
router.put('/profile', authenticate, updateProfile);
// User management (ADMIN only)
router.get('/users', authenticate, authorize('ADMIN'), listUsers);
router.post('/users', authenticate, authorize('ADMIN'), createUser);
router.put('/users/:id', authenticate, authorize('ADMIN'), updateUser);

export default router;
