import { Router } from 'express';
import { listPayrollRuns, createPayrollRun, getPayrollRun, updateEntry, finalizeRun, exportPayroll, getPayslip, deletePayrollRun } from '../controllers/payrollController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listPayrollRuns);
router.post('/', authorize('ADMIN', 'ACCOUNTANT'), createPayrollRun);
router.get('/:runId', getPayrollRun);
router.put('/:runId/entries/:entryId', authorize('ADMIN', 'ACCOUNTANT'), updateEntry);
router.post('/:runId/finalize', authorize('ADMIN', 'ACCOUNTANT'), finalizeRun);
router.delete('/:runId', authorize('ADMIN', 'ACCOUNTANT'), deletePayrollRun);
router.get('/:runId/export', authorize('ADMIN', 'ACCOUNTANT'), exportPayroll);
router.get('/:runId/payslip/:employeeId', authorize('ADMIN', 'ACCOUNTANT'), getPayslip);

export default router;
