import { Router } from 'express';
import { listPayrollRuns, createPayrollRun, getPayrollRun, updateEntry, finalizeRun, exportPayroll, getPayslip, deletePayrollRun } from '../controllers/payrollController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listPayrollRuns);
router.post('/', createPayrollRun);
router.get('/:runId', getPayrollRun);
router.put('/:runId/entries/:entryId', updateEntry);
router.post('/:runId/finalize', finalizeRun);
router.delete('/:runId', authorize('ADMIN', 'ACCOUNTANT'), deletePayrollRun);
router.get('/:runId/export', exportPayroll);
router.get('/:runId/payslip/:employeeId', getPayslip);

export default router;
