import { EmployeeDetail } from '../../components/Employees';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <EmployeeDetail id={id} />; }
