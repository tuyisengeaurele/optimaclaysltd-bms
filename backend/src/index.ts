import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/authRoutes';
import employeeRoutes from './routes/employeeRoutes';
import payrollRoutes from './routes/payrollRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import productionRoutes from './routes/productionRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import customerRoutes from './routes/customerRoutes';
import orderRoutes from './routes/orderRoutes';
import proformaRoutes from './routes/proformaRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import paymentRoutes from './routes/paymentRoutes';
import deliveryRoutes from './routes/deliveryRoutes';
import expenseRoutes from './routes/expenseRoutes';
import reportRoutes from './routes/reportRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/production', productionRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/proforma', proformaRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/deliveries', deliveryRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`OPTIMA CLAYS API running on port ${PORT}`);
});

export default app;
