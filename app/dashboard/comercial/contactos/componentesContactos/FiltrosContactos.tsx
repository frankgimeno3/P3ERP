'use client'

import TableFilters from '@/app/components/TableFilters';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import React, { FC } from 'react';

interface FiltrosContactosProps {
  contactoFiltro: string;
  setContactoFiltro: (value: string) => void;
  apellidosFiltro: string;
  setApellidosFiltro: (value: string) => void;
  codigoContactoFiltro: string;
  setCodigoContactoFiltro: (value: string) => void;
  empresaAsociadaFiltro: string;
  setEmpresaAsociadaFiltro: (value: string) => void;
  telFiltro: string;
  setTelFiltro: (value: string) => void;
  emailFiltro: string;
  setEmailFiltro: (value: string) => void;
  paisFiltro: string;
  setPaisFiltro: (value: string) => void;
}

const FiltrosContactos: FC<FiltrosContactosProps> = ({
  contactoFiltro,
  setContactoFiltro,
  apellidosFiltro,
  setApellidosFiltro,
  codigoContactoFiltro,
  setCodigoContactoFiltro,
  empresaAsociadaFiltro,
  setEmpresaAsociadaFiltro,
  telFiltro,
  setTelFiltro,
  emailFiltro,
  setEmailFiltro,
  paisFiltro,
  setPaisFiltro
}) => {

  return <TableFilters><div className="contents">{[
['Nombre',contactoFiltro,setContactoFiltro],['Apellidos',apellidosFiltro,setApellidosFiltro],['ID contacto',codigoContactoFiltro,setCodigoContactoFiltro],['Empresa',empresaAsociadaFiltro,setEmpresaAsociadaFiltro],['Telefono',telFiltro,setTelFiltro],['Email',emailFiltro,setEmailFiltro],['Pais',paisFiltro,setPaisFiltro]
].map(([label,value,setter])=><TableColumnFilter key={label as string} label={label as string} value={value as string} onChange={setter as (value:string)=>void}/>)}</div></TableFilters>;
};

export default FiltrosContactos;
