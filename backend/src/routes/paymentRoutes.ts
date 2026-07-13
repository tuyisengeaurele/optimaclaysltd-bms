import { Router } from 'express';
import { listPayments, createPayment } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);
router.use(auditLog('payment'));

router.get('/', listPayments);
router.post('/', createPayment);

export default router;
