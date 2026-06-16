import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getNotifications, markRead, generateNotifications } from '../controllers/notificationController';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.post('/read', markRead);
router.post('/generate', generateNotifications);

export default router;
