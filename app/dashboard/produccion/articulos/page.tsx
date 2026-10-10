import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import ControlRedaccionTable from '../control_redaccion/ControlRedaccionTable';
export default function ArticlesPage(){return <main className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal="Artículos"/><div className="p-6 lg:p-12"><h1 className="mb-5 text-2xl font-semibold text-blue-950">Artículos</h1><ControlRedaccionTable/></div></main>;}
