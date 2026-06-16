import { Router } from 'express';
import { productionReport, salesReport, payrollReport, financialReport, exportInvoicesCSV, exportExpensesCSV, exportPaymentsCSV } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/production', productionReport);
router.get('/sales', salesReport);
router.get('/payroll', payrollReport);
router.get('/financials', financialReport);
router.get('/export/invoices', exportInvoicesCSV);
router.get('/export/expenses', exportExpensesCSV);
router.get('/export/payments', exportPaymentsCSV);

export default router;
