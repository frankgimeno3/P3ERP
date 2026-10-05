'use client';

import React, { FC, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {CuentaService} from '@/app/service/CuentaService';
import { AgenteService } from '@/app/service/AgenteService';
import LastTigerUpdate from '../LastTigerUpdate';

interface Cuenta {
  id_cuenta: string;
  id_edisoft: string;
  nombre_empresa: string;
  pais_cuenta: string;
  id_agente: string;
  datos_comerciales: {
    telefono_principal_cuenta: string;
  };
  fechaUltimoComentario?: string;  
}

interface TablacuentasProps {
  page?:number;
  onPageChange?:React.Dispatch<React.SetStateAction<number>>;
  clienteFiltro: string;
  codigoCrmFiltro: string;
  codigoEdisoftFiltro: string;
  agenteFiltro: string;
  telFiltro: string;
  paisFiltro: string;
}

interface Agente {
  id_agente: string;
  nombre_completo_agente: string;
}

const Tablacuentas: FC<TablacuentasProps> = ({
  clienteFiltro,
  codigoCrmFiltro,
  codigoEdisoftFiltro,
  agenteFiltro,
  telFiltro,
  paisFiltro,page,onPageChange,
}) => {
  const router = useRouter();
  const [localPage,setLocalPage]=useState(1);
  const currentPage=page??localPage,setCurrentPage=onPageChange??setLocalPage;
  const [totalResults,setTotalResults]=useState(0);
  const [resultados, setResultados] = useState<Cuenta[]>([]);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt,setAttempt]=useState(0);
  const itemsPerPage = 15;

  useEffect(() => {
    let isMounted = true;

    AgenteService.getAgentes()
      .then((data) => {
        if (isMounted) setAgentes(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error('Error fetching agentes:', error);
        if (isMounted) setAgentes([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch cuentas from API
  useEffect(() => {
    const controller=new AbortController();setLoading(true);setError(null);
    const fetchCuentas = async () => {
      try {
        setLoading(true);
        setError(null);
        const filters = {
          clienteFiltro: clienteFiltro || '',
          codigoCrmFiltro: codigoCrmFiltro || '',
          codigoEdisoftFiltro: codigoEdisoftFiltro || '',
          agenteFiltro: agenteFiltro || '',
          telFiltro: telFiltro || '',
          paisFiltro: paisFiltro || '',limit:itemsPerPage,page:currentPage,
        };
        const data = await CuentaService.getCuentas(filters,{signal:controller.signal});
        if(!controller.signal.aborted){setResultados(data.rows || []);setTotalResults(data.total || 0);}
      } catch (err: any) {
        if(controller.signal.aborted)return;
        // Si es un error 400, podría ser un problema de autenticación o validación
        if (err?.response?.status === 400) {
          setError('Error de autenticación o validación. Por favor, verifica tu sesión.');
        } else {
          setError(err?.message || 'Error al cargar las cuentas');
        }
      } finally {
        if(!controller.signal.aborted)setLoading(false);
      }
    };

    const timer=setTimeout(fetchCuentas,250);
    return()=>{clearTimeout(timer);controller.abort();};
  }, [clienteFiltro, codigoCrmFiltro, codigoEdisoftFiltro, agenteFiltro, telFiltro, paisFiltro,currentPage,attempt]);

  const resultadosFiltrados = useMemo(() => {
    // Server-side filtering is already done, but we can do additional client-side filtering if needed
    return resultados;
  }, [resultados]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    if(!onPageChange)setLocalPage(1);
  }, [clienteFiltro, codigoCrmFiltro, codigoEdisoftFiltro, agenteFiltro, telFiltro, paisFiltro,onPageChange]);

  const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));
  const resultadosPaginados = resultadosFiltrados;

  const getNombreCompletoAgente = (idAgente: string) => {
    const agente = agentes.find((a) => a.id_agente === idAgente);
    return agente ? agente.nombre_completo_agente : idAgente;
  };

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  if (loading && !resultados.length) {
    return (
      <div className="mt-5 flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Cargando cuentas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-5 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
        <p className="text-center">{error}</p>
        <button type="button" onClick={()=>setAttempt(value=>value+1)} className="cursor-pointer rounded border px-3 py-2 hover:bg-red-50">Reintentar</button>
      </div>
    );
  }

  if (resultadosFiltrados.length === 0 && !loading) {
    return (
      <div className="mt-5 p-4 bg-white rounded-lg shadow-xl">
        <p className="text-center text-gray-500">No hay datos en la base de datos.</p>
      </div>
    );
  }

  return (
        <div className="">
      {loading&&<p role="status" className="mt-4 text-sm text-blue-950">Actualizando cuentas…</p>}
      <table className="mt-5  rounded-lg shadow-xl bg-white min-w-full">
        <thead className="bg-blue-950/80 text-white rounded-lg">
          <tr>
            <th className="text-left p-2 font-light pl-6">Nombre Empresa </th>
            <th className="text-left p-2 font-light">ID cuenta (Tiger)</th>
            <th className="text-left p-2 font-light">Código Edisoft</th>
            <th className="text-left p-2 font-light">Agente Asignado</th>
            <th className="text-left p-2 font-light">País</th>
            <th className="text-left p-2 font-light">Tel principal</th>
           </tr>
        </thead>
        <tbody>
          {resultadosPaginados.map((res) => (
            <tr
              key={res.id_cuenta}
              onClick={(e) => handleRowClick(e, `/dashboard/comercial/cuentas/${res.id_cuenta}`)}
              className="border-t border-gray-200 hover:bg-gray-100/30 cursor-pointer"
            >
              <td className="p-2 border-b border-gray-200 pl-6">{res.nombre_empresa}</td>
              <td className="p-2 border-b border-gray-200">{res.id_cuenta}</td>
              <td className="p-2 border-b border-gray-200">{res.id_edisoft || '—'}</td>
              <td className="p-2 border-b border-gray-200">{getNombreCompletoAgente(res.id_agente)}</td>
              <td className="p-2 border-b border-gray-200">{res.pais_cuenta}</td>
              <td className="p-2 border-b border-gray-200">
                {res.datos_comerciales?.telefono_principal_cuenta || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {resultadosFiltrados.length > 0 && (
        <div className="relative mt-4 grid grid-cols-3 items-center">
          <div />
          <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg ${
              currentPage === 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-950 text-white hover:bg-blue-900 cursor-pointer'
            }`}
          >
            Anterior
          </button>
          <span className="text-gray-600">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg ${
              currentPage === totalPages
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-950 text-white hover:bg-blue-900 cursor-pointer'
            }`}
          >
            Siguiente
          </button>
          </div>
          <LastTigerUpdate type="cuentas" />
        </div>
      )}
    </div>
  );
};

export default Tablacuentas;
