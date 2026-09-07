import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import ControlRedaccionTable from './ControlRedaccionTable';
export default function ControlRedaccionPage(){return <div className="flex min-h-screen w-full flex-col bg-gray-200 text-[15px] text-gray-600"><MiddleNav tituloprincipal="Control redacción"/><main className="min-h-screen w-full bg-gray-100 p-0"><ControlRedaccionTable/></main></div>}
