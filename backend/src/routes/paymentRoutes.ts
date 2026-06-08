import { Router } from 'express';
import { listPayments, createPayment } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listPayments);
router.post('/', createPayment);

export default router;
