import { Router } from 'express';
import { listInvoices, createInvoice, getInvoice } from '../controllers/invoiceController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);

export default router;
