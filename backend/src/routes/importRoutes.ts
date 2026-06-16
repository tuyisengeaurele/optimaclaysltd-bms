import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { importCustomers, importEmployees } from '../controllers/importController';

const router = Router();

router.use(authenticate);
router.post('/customers', authorize('ADMIN', 'SALES_OFFICER'), importCustomers);
router.post('/employees', authorize('ADMIN'), importEmployees);

export default router;
