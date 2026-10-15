'use client';
import {useUrlState} from '@/app/lib/useUrlState';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import ModuleTabs from '@/app/components/ModuleTabs';
import ContentsList from './ContentsList';
import ControlRedaccionTable from '../control_redaccion/ControlRedaccionTable';
export default function ContenidosPage(){
 const [section,setSection]=useUrlState<string>('contents.section','contenidos');
 const [contentTab,setContentTab]=useUrlState<'revista'|'todos'>('contents.tab','revista');
 const activeSection=section==='articulos'?'articulos':section==='otros'||(section==='contenidos'&&contentTab==='todos')?'otros':'revista';
 return <main className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal="GESTION PRODUCCION" currentLabel="GESTION PRODUCCION"/><div className="p-6 lg:p-12">
  <ModuleTabs plain label="Producción" value={activeSection} items={[{value:'revista',label:'Contenidos revista'},{value:'otros',label:'Otros contenidos contratados'},{value:'articulos',label:'Artículos'}]} onChange={value=>{setSection(value);if(value!=='articulos')setContentTab(value==='otros'?'todos':'revista');}}/>
  <div role="tabpanel" className="pt-5">{activeSection==='articulos'?<ControlRedaccionTable plain/>:<ContentsList tab={activeSection==='otros'?'todos':'revista'}/>}</div>
 </div></main>;
}
