import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController';

const router = Router();

router.use(authenticate);
router.use(auditLog('supplier'));

router.get('/', listSuppliers);
router.post('/', authorize('ADMIN', 'STORE_MANAGER'), createSupplier);
router.put('/:id', authorize('ADMIN', 'STORE_MANAGER'), updateSupplier);
router.delete('/:id', authorize('ADMIN'), deleteSupplier);

export default router;
