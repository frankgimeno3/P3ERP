'use client';

import Link from 'next/link';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContratoService } from '@/app/service/ContratoService';
import { AgenteService } from '@/app/service/AgenteService';

const parseDMY = (s?: string): Date | null => {
  if (!s) return null;
  const [d, m, y] = s.split('/').map(p => p.trim());
  if (!d || !m || !y) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
};

const formatDateToISO = (s?: string): string => {
  const d = parseDMY(s);
  if (!d) return '-';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const formatMoney = (value?: number): string => {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString('es-ES')} €` : '-';
};

interface ContenidoPorClienteProps {
  estado?: 'curso' | 'anteriores';
}

const inputClass = "rounded border border-gray-300 px-3 py-2 text-sm";

const ContenidoPorCliente: FC<ContenidoPorClienteProps> = ({ estado = 'curso' }) => {
  const router = useRouter();
  const [contratos, setContratos] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [agenteFiltro, setAgenteFiltro] = useState('');
  const [contactoFiltro, setContactoFiltro] = useState('');
  const [propuestaFiltro, setPropuestaFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContratos = async () => {
      try {
        setLoading(true);
        setError('');
        const [data, agentesData] = await Promise.all([ContratoService.getContratos(), AgenteService.getAgentes()]);
        setContratos(Array.isArray(data) ? data : []);
        setAgentes(Array.isArray(agentesData) ? agentesData : []);
      } catch (err) {
        console.error('Error fetching contratos:', err);
        setError('No se han podido cargar los contratos.');
      } finally {
        setLoading(false);
      }
    };

    fetchContratos();
  }, []);

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
      return;
    }
    router.push(href);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const contratosFiltrados = useMemo(() => {
    return contratos.filter((contrato) => {
      const fechaFin = parseDMY(contrato.fecha_fin_contrato);
      const matchEstado = estado === 'anteriores' ? Boolean(fechaFin && fechaFin < today) : !fechaFin || fechaFin >= today;
      const matchCliente = !clienteFiltro || `${contrato.nombre_empresa || ''} ${contrato.id_cuenta_contrato || ''}`.toLowerCase().includes(clienteFiltro.toLowerCase());
      const matchAgente = !agenteFiltro || contrato.id_agente_contrato === agenteFiltro;
      const matchContacto = !contactoFiltro || `${contrato.nombre_contacto || ''} ${contrato.id_contacto_contrato || ''}`.toLowerCase().includes(contactoFiltro.toLowerCase());
      const matchPropuesta = !propuestaFiltro || String(contrato.id_propuesta || '').toLowerCase().includes(propuestaFiltro.toLowerCase());
      return matchEstado && matchCliente && matchAgente && matchContacto && matchPropuesta;
    });
  }, [agenteFiltro, clienteFiltro, contactoFiltro, contratos, estado, propuestaFiltro]);

  return (
    <div className="mt-8 flex flex-col gap-4 rounded-xl">
      <div className="flex flex-wrap gap-3 rounded bg-white p-4 shadow-sm">
        <input value={clienteFiltro} onChange={(event) => setClienteFiltro(event.target.value)} placeholder="Filtrar cliente" className={inputClass} />
        <select aria-label="Filtrar por agente" value={agenteFiltro} onChange={(event) => setAgenteFiltro(event.target.value)} className={`${inputClass} bg-white`}><option value="">Todos los agentes</option>{agentes.map((agente) => <option key={agente.id_agente} value={agente.id_agente}>{agente.nombre_completo_agente || `${agente.nombre_agente || ''} ${agente.apellidos_agente || ''}`.trim()}</option>)}</select>
        <input value={contactoFiltro} onChange={(event) => setContactoFiltro(event.target.value)} placeholder="Filtrar contacto" className={inputClass} />
        <input value={propuestaFiltro} onChange={(event) => setPropuestaFiltro(event.target.value)} placeholder="Filtrar propuesta" className={inputClass} />
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-blue-950 text-white">
            <tr>
              <th className="p-2 pl-6 text-left font-light">Contrato</th>
              <th className="p-2 text-left font-light">Empresa</th>
              <th className="p-2 text-left font-light">Fecha de firma</th>
              <th className="p-2 text-left font-light">Contacto principal</th>
              <th className="p-2 text-left font-light">Agente</th>
              <th className="p-2 text-left font-light">Propuesta</th>
              <th className="p-2 text-left font-light">Importe</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">Cargando contratos...</td>
              </tr>
            )}
            {!loading && contratosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">No hay contratos para mostrar.</td>
              </tr>
            )}
            {!loading && contratosFiltrados.map((contrato) => {
              const idContrato = `${contrato.id_contrato ?? 'no_id'}`;
              return (
                <tr
                  key={idContrato}
                  onClick={(e) => handleRowClick(e, `/dashboard/comercial/contratos/${idContrato}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="border-b border-gray-200 p-2 pl-6 font-medium text-blue-950">{idContrato}</td>
                  <td className="border-b border-gray-200 p-2">
                    {contrato.id_cuenta_contrato ? (
                      <Link onClick={(e) => e.stopPropagation()} href={`/dashboard/comercial/cuentas/${contrato.id_cuenta_contrato}`} className="rounded bg-blue-50 px-2 py-1 text-blue-950 hover:bg-blue-100">
                        {contrato.nombre_empresa || contrato.id_cuenta_contrato}
                      </Link>
                    ) : '-'}
                  </td>
                  <td className="border-b border-gray-200 p-2">{formatDateToISO(contrato.fecha_firma_contrato)}</td>
                  <td className="border-b border-gray-200 p-2">
                    {contrato.id_contacto_contrato ? (
                      <Link onClick={(e) => e.stopPropagation()} href={`/dashboard/comercial/contactos/${contrato.id_contacto_contrato}`} className="rounded bg-blue-50 px-2 py-1 text-blue-950 hover:bg-blue-100">
                        {contrato.nombre_contacto || contrato.id_contacto_contrato}
                      </Link>
                    ) : '-'}
                  </td>
                  <td className="border-b border-gray-200 p-2">{contrato.nombre_agente_contrato || contrato.id_agente_contrato || '-'}</td>
                  <td className="border-b border-gray-200 p-2">
                    {contrato.id_propuesta ? (
                      <Link onClick={(e) => e.stopPropagation()} href={`/dashboard/comercial/propuestas/${contrato.id_propuesta}`} className="rounded bg-blue-50 px-2 py-1 text-blue-950 hover:bg-blue-100">
                        {contrato.id_propuesta}
                      </Link>
                    ) : '-'}
                  </td>
                  <td className="border-b border-gray-200 p-2">{formatMoney(contrato.importe_contrato_con_iva)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContenidoPorCliente;
