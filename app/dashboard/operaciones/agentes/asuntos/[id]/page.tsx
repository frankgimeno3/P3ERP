import { EmployeeDetail } from '../../../../direccion/laboral/components/Employees';
import '../../../../direccion/laboral/laboral.css';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <main className="laboral min-h-screen bg-gray-100 p-5 text-sm text-slate-800"><EmployeeDetail id={id} /></main>; }
