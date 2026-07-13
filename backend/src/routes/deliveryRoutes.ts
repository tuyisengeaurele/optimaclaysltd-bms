import { Router } from 'express';
import { listDeliveries, createDelivery, updateDeliveryStatus, recordDamage, downloadWaybillPdf, deleteDelivery } from '../controllers/deliveryController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);
router.use(auditLog('delivery'));

router.get('/', listDeliveries);
router.post('/', createDelivery);
router.get('/:id/waybill', downloadWaybillPdf);
router.put('/:id/status', updateDeliveryStatus);
router.put('/:id/damage', recordDamage);
router.delete('/:id', authorize('ADMIN'), deleteDelivery);

export default router;
