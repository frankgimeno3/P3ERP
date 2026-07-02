'use client'
import React, { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContratoService } from '@/app/service/ContratoService';

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
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}`;
};

const formatMoney = (value?: number): string => {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString('es-ES')} €` : '-';
};

interface ContenidoPorClienteProps {}

const ContenidoPorCliente: FC<ContenidoPorClienteProps> = () => {
  const router = useRouter();
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContratos = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await ContratoService.getContratos();
        setContratos(Array.isArray(data) ? data : []);
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
    } else {
      router.push(href);
    }
  };
  
  return (
    <div className="flex flex-col gap-3 mt-12 rounded-xl">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-blue-950 text-white">
            <tr>
              <th className="text-left p-2 font-light pl-6">Contrato</th>
              <th className="text-left p-2 font-light">Empresa</th>
              <th className="text-left p-2 font-light">Fecha de firma</th>
              <th className="text-left p-2 font-light">Contacto principal</th>
              <th className="text-left p-2 font-light">Agente</th>
              <th className="text-left p-2 font-light">Importe</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  Cargando contratos...
                </td>
              </tr>
            )}

            {!loading && contratos.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No hay contratos disponibles.
                </td>
              </tr>
            )}

            {!loading && contratos.map((contrato) => {
              const idContrato = `${contrato.id_contrato ?? 'no_id'}`;

              return (
                <tr
                  key={idContrato}
                  onClick={(e) => handleRowClick(e, `/dashboard/comercial/contratos/${idContrato}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="p-2 border-b border-gray-200 pl-6 font-medium text-blue-950">{idContrato}</td>
                  <td className="p-2 border-b border-gray-200">{contrato.nombre_empresa || contrato.id_cuenta_contrato || '-'}</td>
                  <td className="p-2 border-b border-gray-200">{formatDateToISO(contrato.fecha_firma_contrato)}</td>
                  <td className="p-2 border-b border-gray-200">{contrato.nombre_contacto || contrato.id_contacto_contrato || '-'}</td>
                  <td className="p-2 border-b border-gray-200">{contrato.nombre_agente_contrato || contrato.id_agente_contrato || '-'}</td>
                  <td className="p-2 border-b border-gray-200">{formatMoney(contrato.importe_contrato_con_iva)}</td>
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
