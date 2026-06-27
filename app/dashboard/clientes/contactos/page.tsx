'use client';

import React, { FC, useState, useEffect } from 'react';
import FiltrosContactos from './componentesContactos/FiltrosContactos';
import TablaContactos from './componentesContactos/TablaContactos';
import MiddleNav from '../../../general_components/componentes_recurrentes/MiddleNav';
import ButtonsRow from '@/app/general_components/componentes_recurrentes/ButtonsRow';
import contactosJSON from "@/app/contents/contactsContents.json";
import { InterfazContacto } from '@/app/interfaces/interfaces';
import Link from 'next/link';

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

 useEffect(() => {
  const mapeados: InterfazContacto[] = contactosJSON.map((c) => ({
    ...c,
    nombre_completo_contacto: `${c.nombre_contacto} ${c.apellidos_contacto}`,
    suscripciones: c.suscripciones ?? [],
    cargo_contacto: c.cargo_contacto ?? '',
    conocido_en: c.conocido_en ?? '',
    contactado_en_feria: c.contactado_en_feria ?? '',
    otros_datos_interes: c.otros_datos_interes ?? '',
    pais_contacto: c.pais_contacto ?? '',
  }));

  setAllContactos(mapeados);
}, []);

  const filteredContactos = allContactos.filter((c) =>
    c.nombre_contacto.toLowerCase().includes(contactoFiltro.toLowerCase()) &&
    c.apellidos_contacto.toLowerCase().includes(apellidosFiltro.toLowerCase()) &&
    c.id_cuenta.toLowerCase().includes(codigoContactoFiltro.toLowerCase()) &&
    c.nombre_empresa.toLowerCase().includes(empresaAsociadaFiltro.toLowerCase()) &&
    c.telefono_contacto.includes(telFiltro) &&
    c.email_contacto.toLowerCase().includes(emailFiltro.toLowerCase()) &&
    c.pais_contacto.toLowerCase().includes(paisFiltro.toLowerCase())
  );

  const startIdx = (currentPage - 1) * itemsPerPage;
  const contactosFiltrados = filteredContactos.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Contactos" />
      <div className="bg-gray-100 min-h-screen px-8 text-gray-600">
        <div className="flex flex-row justify-end py-4">
          <Link
            href="/dashboard/clientes/contactos/crear"
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

        <TablaContactos contactosFiltrados={contactosFiltrados} />

        <div className="mt-4">
          <ButtonsRow
            totalItems={filteredContactos.length}
            currentNumber={currentPage}
            onPageChange={(page) => setCurrentPage(page)}
            itemsPerPage={itemsPerPage}
          />
        </div>
      </div>
    </div>
  );
};

export default Contactos;
