import { Router } from 'express';
import { listProformas, createProforma, getProforma, downloadProformaPdf, deleteProforma } from '../controllers/proformaController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);
router.use(auditLog('proforma'));

router.get('/', listProformas);
router.post('/', createProforma);
router.get('/:id', getProforma);
router.get('/:id/pdf', downloadProformaPdf);
router.delete('/:id', authorize('ADMIN'), deleteProforma);

export default router;
