import { Router } from 'express';
import { createProforma, getProforma, printProforma } from '../controllers/proformaController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', createProforma);
router.get('/:id', getProforma);
router.get('/:id/print', printProforma);

export default router;
