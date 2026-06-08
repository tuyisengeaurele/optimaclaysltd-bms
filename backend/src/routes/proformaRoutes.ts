import { Router } from 'express';
import { listProformas, createProforma, getProforma, printProforma, deleteProforma } from '../controllers/proformaController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listProformas);
router.post('/', createProforma);
router.get('/:id', getProforma);
router.get('/:id/print', printProforma);
router.delete('/:id', authorize('ADMIN'), deleteProforma);

export default router;
