import { Router } from 'express';
import { getCompanySettings, updateCompanySettings, getPinnedKpis, updatePinnedKpis } from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);
router.use(auditLog('settings'));

router.get('/company', getCompanySettings);
router.put('/company', authorize('ADMIN'), updateCompanySettings);
router.get('/kpis', getPinnedKpis);
router.put('/kpis', updatePinnedKpis);

export default router;
