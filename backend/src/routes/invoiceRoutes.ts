import { Router } from 'express';
import { listInvoices, createInvoice, getInvoice, deleteInvoice } from '../controllers/invoiceController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.delete('/:id', authorize('ADMIN', 'ACCOUNTANT'), deleteInvoice);

export default router;
