import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listAuditLogs } from '../controllers/auditController';

const router = Router();

router.use(authenticate);
router.get('/', authorize('ADMIN'), listAuditLogs);

export default router;
