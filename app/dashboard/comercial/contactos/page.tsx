'use client';

import {useUrlState} from '@/app/lib/useUrlState';
import type {TableSort} from '@/app/components/SortableTable';
import React, { FC, useState, useEffect } from 'react';
import FiltrosContactos from './componentesContactos/FiltrosContactos';
import TablaContactos from './componentesContactos/TablaContactos';
import MiddleNav from '../../../general_components/componentes_recurrentes/MiddleNav';
import { InterfazContacto } from '@/app/interfaces/interfaces';
import Link from 'next/link';
import { ContactoService } from '@/app/service/ContactoService';
import LastTigerUpdate from '../LastTigerUpdate';

const Contactos: FC = () => {
  const [sort,setSort]=useState<TableSort|null>(null);
  const [tableState,setTableState]=useUrlState('contacts.table',{contactoFiltro:'',apellidosFiltro:'',codigoContactoFiltro:'',empresaAsociadaFiltro:'',telFiltro:'',emailFiltro:'',paisFiltro:'',currentPage:1});
  const {contactoFiltro,apellidosFiltro,codigoContactoFiltro,empresaAsociadaFiltro,telFiltro,emailFiltro,paisFiltro}=tableState;
  const currentPage=Math.max(1,Math.trunc(tableState.currentPage));
  const setCurrentPage:React.Dispatch<React.SetStateAction<number>>=value=>setTableState(previous=>({...previous,currentPage:typeof value==='function'?value(previous.currentPage):value}));
  const setContactoFiltro:React.Dispatch<React.SetStateAction<string>>=value=>setTableState(previous=>({...previous,contactoFiltro:typeof value==='function'?value(previous.contactoFiltro):value,currentPage:1}));
  const setApellidosFiltro:React.Dispatch<React.SetStateAction<string>>=value=>setTableState(previous=>({...previous,apellidosFiltro:typeof value==='function'?value(previous.apellidosFiltro):value,currentPage:1}));
  const setCodigoContactoFiltro:React.Dispatch<React.SetStateAction<string>>=value=>setTableState(previous=>({...previous,codigoContactoFiltro:typeof value==='function'?value(previous.codigoContactoFiltro):value,currentPage:1}));
  const setEmpresaAsociadaFiltro:React.Dispatch<React.SetStateAction<string>>=value=>setTableState(previous=>({...previous,empresaAsociadaFiltro:typeof value==='function'?value(previous.empresaAsociadaFiltro):value,currentPage:1}));
  const setTelFiltro:React.Dispatch<React.SetStateAction<string>>=value=>setTableState(previous=>({...previous,telFiltro:typeof value==='function'?value(previous.telFiltro):value,currentPage:1}));
  const setEmailFiltro:React.Dispatch<React.SetStateAction<string>>=value=>setTableState(previous=>({...previous,emailFiltro:typeof value==='function'?value(previous.emailFiltro):value,currentPage:1}));
  const setPaisFiltro:React.Dispatch<React.SetStateAction<string>>=value=>setTableState(previous=>({...previous,paisFiltro:typeof value==='function'?value(previous.paisFiltro):value,currentPage:1}));


  const itemsPerPage = 15;

  const [totalResults,setTotalResults]=useState(0);
  const [allContactos, setAllContactos] = useState<InterfazContacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  const controller=new AbortController();
  const fetchContactos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ContactoService.getContactos({limit:itemsPerPage,page:currentPage,sortBy:sort?['nombre_contacto','apellidos_contacto','id_contacto','nombre_empresa','telefono_contacto','email_contacto'][sort.column]:'',sortDirection:sort?.direction,nombre_contacto:contactoFiltro,apellidos_contacto:apellidosFiltro,id_contacto:codigoContactoFiltro,nombre_empresa:empresaAsociadaFiltro,telefono_contacto:telFiltro,email_contacto:emailFiltro,pais_contacto:paisFiltro},{signal:controller.signal});
      const mapeados: InterfazContacto[] = (data.rows||[]).map((c: InterfazContacto) => ({
        ...c,
        nombre_contacto: c.nombre_contacto ?? '',
        apellidos_contacto: c.apellidos_contacto ?? '',
        nombre_completo_contacto: c.nombre_completo_contacto || `${c.nombre_contacto || ''} ${c.apellidos_contacto || ''}`.trim(),
        id_cuenta: c.id_cuenta ?? '',
        nombre_empresa: c.nombre_empresa ?? '',
        telefono_contacto: c.telefono_contacto ?? '',
        email_contacto: c.email_contacto ?? '',
        suscripciones: c.suscripciones ?? [],
        cargo_contacto: c.cargo_contacto ?? '',
        conocido_en: c.conocido_en ?? '',
        contactado_en_feria: c.contactado_en_feria ?? '',
        otros_datos_interes: c.otros_datos_interes ?? '',
        pais_contacto: c.pais_contacto ?? '',
      }));

      if(!controller.signal.aborted){setAllContactos(mapeados);setTotalResults(data.total||0);}
    } catch (error: any) {
      if(controller.signal.aborted)return;
      setError(error?.message || 'No se han podido cargar los contactos.');
      setAllContactos([]);
    } finally {
      if(!controller.signal.aborted)setLoading(false);
    }
  };

  const timer=setTimeout(fetchContactos,250);return()=>{clearTimeout(timer);controller.abort();};
}, [currentPage,contactoFiltro,apellidosFiltro,codigoContactoFiltro,empresaAsociadaFiltro,telFiltro,emailFiltro,paisFiltro,sort]);


  const filteredContactos = allContactos.filter((c) =>
    (c.nombre_contacto || '').toLowerCase().includes(contactoFiltro.toLowerCase()) &&
    (c.apellidos_contacto || '').toLowerCase().includes(apellidosFiltro.toLowerCase()) &&
    (c.id_contacto || '').toLowerCase().includes(codigoContactoFiltro.toLowerCase()) &&
    (c.nombre_empresa || '').toLowerCase().includes(empresaAsociadaFiltro.toLowerCase()) &&
    (c.telefono_contacto || '').includes(telFiltro) &&
    (c.email_contacto || '').toLowerCase().includes(emailFiltro.toLowerCase()) &&
    (c.pais_contacto || '').toLowerCase().includes(paisFiltro.toLowerCase())
  );

  const contactosFiltrados = filteredContactos;
  const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Contactos" />
      <div className="bg-gray-100 min-h-screen px-8 text-gray-600">
        <p role="status" className="pt-4 text-sm font-semibold">{loading ? 'Cargando total…' : error ? 'No se ha podido cargar el total de contactos.' : `Total de contactos: ${totalResults.toLocaleString('es-ES')}`}</p>
        <div className="flex flex-row justify-end py-4">
          <Link
            href="/dashboard/comercial/contactos/crear"
            className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900 text-sm"
          >
            <p>Crear contacto</p>
          </Link>
        </div>

        <FiltrosContactos
          contactoFiltro={contactoFiltro}
          setContactoFiltro={setContactoFiltro}
          apellidosFiltro={apellidosFiltro}
          setApellidosFiltro={setApellidosFiltro}
          codigoContactoFiltro={codigoContactoFiltro}
          setCodigoContactoFiltro={setCodigoContactoFiltro}
          empresaAsociadaFiltro={empresaAsociadaFiltro}
          setEmpresaAsociadaFiltro={setEmpresaAsociadaFiltro}
          telFiltro={telFiltro}
          setTelFiltro={setTelFiltro}
          emailFiltro={emailFiltro}
          setEmailFiltro={setEmailFiltro}
          paisFiltro={paisFiltro}
          setPaisFiltro={setPaisFiltro}  
        />

        {loading && allContactos.length>0 && <p role="status">Actualizando contactos...</p>}
        {error && <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading && !allContactos.length ? (
          <div className="mt-5 rounded bg-white p-6 text-sm text-gray-500 shadow-xl">Cargando contactos...</div>
        ) : (
          <TablaContactos contactosFiltrados={contactosFiltrados} sort={sort} onSortChange={next=>{setSort(next);setCurrentPage(1);}} />
        )}

        <div className="mt-4 grid grid-cols-3 items-center">
          <div />
          <div className="flex items-center justify-center gap-2">
            <button onClick={()=>setCurrentPage((page)=>Math.max(1,page-1))} disabled={currentPage===1} className={`rounded-lg px-4 py-2 ${currentPage===1?'cursor-not-allowed bg-gray-300 text-gray-500':'cursor-pointer bg-blue-950 text-white hover:bg-blue-900'}`}>Anterior</button>
            <span>Página {currentPage} de {totalPages}</span>
            <button onClick={()=>setCurrentPage((page)=>Math.min(totalPages,page+1))} disabled={currentPage===totalPages} className={`rounded-lg px-4 py-2 ${currentPage===totalPages?'cursor-not-allowed bg-gray-300 text-gray-500':'cursor-pointer bg-blue-950 text-white hover:bg-blue-900'}`}>Siguiente</button>
          </div>
          <LastTigerUpdate type="contactos" />
        </div>
      </div>
    </div>
  );
};

export default Contactos;
