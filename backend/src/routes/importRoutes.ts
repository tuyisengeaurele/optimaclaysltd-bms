import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { importCustomers, importEmployees } from '../controllers/importController';

const router = Router();

router.use(authenticate);
router.use(auditLog('import'));
router.post('/customers', authorize('ADMIN', 'SALES_OFFICER'), importCustomers);
router.post('/employees', authorize('ADMIN'), importEmployees);

export default router;
