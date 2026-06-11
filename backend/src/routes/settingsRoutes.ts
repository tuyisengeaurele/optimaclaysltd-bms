import { Router } from 'express';
import { getCompanySettings, updateCompanySettings } from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/company', getCompanySettings);
router.put('/company', authorize('ADMIN'), updateCompanySettings);

export default router;
