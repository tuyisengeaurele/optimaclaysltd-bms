import { Router } from 'express';
import { productionReport, salesReport, payrollReport, financialReport } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/production', productionReport);
router.get('/sales', salesReport);
router.get('/payroll', payrollReport);
router.get('/financials', financialReport);

export default router;
