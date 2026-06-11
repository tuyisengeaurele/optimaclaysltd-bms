import { PrismaClient, Role, WageType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const hashedPassword = await bcrypt.hash('Admin@1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@optimaclays.rw' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@optimaclays.rw',
      password: hashedPassword,
      full_name: 'System Administrator',
      role: Role.ADMIN,
    },
  });

  // 13 employees
  const employees = [
    { full_name: 'RURANGWA Emmanuel', bank_name: '40- Bank of Kigali', bank_account_number: '100083409732' },
    { full_name: 'MANZI Yves', bank_name: '40- Bank of Kigali', bank_account_number: '100189988456' },
    { full_name: 'SIFA Justin', bank_name: '40- Bank of Kigali', bank_account_number: '100238225347' },
    { full_name: 'MUTETERI Emmanuellia', bank_name: '40- Bank of Kigali', bank_account_number: '100238315179' },
    { full_name: 'RUKUNDO Jean Baptiste', bank_name: '40- Bank of Kigali', bank_account_number: '100189998095' },
    { full_name: 'NIZEYIMANA Claver', bank_name: '85- EQUITY BANK', bank_account_number: '4008100930850' },
    { full_name: 'Mushimiyimana Esperance', bank_name: '40- Bank of Kigali', bank_account_number: '100240783597' },
    { full_name: 'NIYONSANGA Athanasie', bank_name: '40- Bank of Kigali', bank_account_number: '100190384033' },
    { full_name: 'NTAKIRUTIMANA Marie Rose', bank_name: '85- EQUITY BANK', bank_account_number: '4008100730335' },
    { full_name: 'UWAMAHORO Clarisse', bank_name: '40- Bank of Kigali', bank_account_number: '100238310533' },
    { full_name: 'ICYORIBERA Xavier', bank_name: '40- Bank of Kigali', bank_account_number: '100252489244' },
    { full_name: 'IRADUKUNDA Jean Pierre', bank_name: '40- Bank of Kigali', bank_account_number: '100252496453' },
    { full_name: 'BIMENYIMANA Wenceslas', bank_name: '40- Bank of Kigali', bank_account_number: '100190004141' },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { national_id: emp.full_name },
      update: {},
      create: {
        full_name: emp.full_name,
        national_id: emp.full_name,
        bank_name: emp.bank_name,
        bank_account_number: emp.bank_account_number,
        wage_type: WageType.MONTHLY,
        base_salary: 0,
        is_active: true,
      },
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
