import { EmployeePayrollDetail } from '../../components/EmployeePayroll';
import { PayrollDetail } from '../../components/Payroll';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return id.startsWith('nomina_emp_') ? <EmployeePayrollDetail id={id} /> : <PayrollDetail id={id} kind="nominas" />; }
