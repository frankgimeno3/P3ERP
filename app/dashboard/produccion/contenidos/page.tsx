'use client';
import {useUrlState} from '@/app/lib/useUrlState';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import ModuleTabs from '@/app/components/ModuleTabs';
import ContentsList from './ContentsList';
import ControlRedaccionTable from '../control_redaccion/ControlRedaccionTable';
export default function ContenidosPage(){
 const [section,setSection]=useUrlState<'contenidos'|'articulos'>('contents.section','contenidos');
 return <main className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal="Contenidos"/><div className="p-6 lg:p-12">
  <h1 className="mb-5 text-2xl font-semibold text-blue-950">Contenidos de producción</h1>
  <ModuleTabs label="Producción" value={section} items={[{value:'contenidos',label:'Contenidos'},{value:'articulos',label:'Artículos'}]} onChange={value=>setSection(value as 'contenidos'|'articulos')}/>
  <div role="tabpanel" className="rounded-b-lg border border-blue-200 border-t-0 bg-blue-50 p-4 lg:p-6">{section==='articulos'?<ControlRedaccionTable/>:<ContentsList/>}</div>
 </div></main>;
}
