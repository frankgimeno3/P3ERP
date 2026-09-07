import { PayrollDetail } from '../../components/Payroll';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PayrollDetail id={id} kind="nominas" />; }
