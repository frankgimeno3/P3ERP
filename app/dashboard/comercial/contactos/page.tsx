'use client';

import React, { FC, useState, useEffect } from 'react';
import FiltrosContactos from './componentesContactos/FiltrosContactos';
import TablaContactos from './componentesContactos/TablaContactos';
import MiddleNav from '../../../general_components/componentes_recurrentes/MiddleNav';
import { InterfazContacto } from '@/app/interfaces/interfaces';
import Link from 'next/link';
import { ContactoService } from '@/app/service/ContactoService';
import LastTigerUpdate from '../LastTigerUpdate';

const Contactos: FC = () => {
  const [contactoFiltro, setContactoFiltro] = useState('');
  const [apellidosFiltro, setApellidosFiltro] = useState('');
  const [codigoContactoFiltro, setCodigoContactoFiltro] = useState('');
  const [empresaAsociadaFiltro, setEmpresaAsociadaFiltro] = useState('');
  const [telFiltro, setTelFiltro] = useState('');
  const [emailFiltro, setEmailFiltro] = useState('');
  const [paisFiltro, setPaisFiltro] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [allContactos, setAllContactos] = useState<InterfazContacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  const fetchContactos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ContactoService.getContactos();
      const mapeados: InterfazContacto[] = (Array.isArray(data) ? data : []).map((c) => ({
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

      setAllContactos(mapeados);
    } catch (error: any) {
      console.error('Error fetching contactos:', error);
      setError(error?.message || 'No se han podido cargar los contactos.');
      setAllContactos([]);
    } finally {
      setLoading(false);
    }
  };

  fetchContactos();
}, []);

  const filteredContactos = allContactos.filter((c) =>
    (c.nombre_contacto || '').toLowerCase().includes(contactoFiltro.toLowerCase()) &&
    (c.apellidos_contacto || '').toLowerCase().includes(apellidosFiltro.toLowerCase()) &&
    (c.id_contacto || '').toLowerCase().includes(codigoContactoFiltro.toLowerCase()) &&
    (c.nombre_empresa || '').toLowerCase().includes(empresaAsociadaFiltro.toLowerCase()) &&
    (c.telefono_contacto || '').includes(telFiltro) &&
    (c.email_contacto || '').toLowerCase().includes(emailFiltro.toLowerCase()) &&
    (c.pais_contacto || '').toLowerCase().includes(paisFiltro.toLowerCase())
  );

  const startIdx = (currentPage - 1) * itemsPerPage;
  const contactosFiltrados = filteredContactos.slice(startIdx, startIdx + itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredContactos.length / itemsPerPage));

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Contactos" />
      <div className="bg-gray-100 min-h-screen px-8 text-gray-600">
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

        {error && <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading ? (
          <div className="mt-5 rounded bg-white p-6 text-sm text-gray-500 shadow-xl">Cargando contactos...</div>
        ) : (
          <TablaContactos contactosFiltrados={contactosFiltrados} />
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
