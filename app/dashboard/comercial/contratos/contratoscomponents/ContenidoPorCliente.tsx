'use client'
import React, { FC } from 'react';
import { useRouter } from 'next/navigation';
import contratosContents from "@/app/contents/contratosContents.json";
import cuentasContents from "@/app/contents/cuentasContents.json";
import contactosContents from "@/app/contents/contactsContents.json";
import { InterfazContacto, InterfazContrato, InterfazCuenta } from '@/app/interfaces/interfaces';
import agentes from "@/app/contents/agentesContents.json"

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

interface ContenidoPorClienteProps {}

const ContenidoPorCliente: FC<ContenidoPorClienteProps> = () => {
  const router = useRouter();

  const contratos = contratosContents as InterfazContrato[];
  const cuentas = cuentasContents as InterfazCuenta[];
  const contactos = contactosContents as InterfazContacto[];

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
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-blue-950 text-white">
            <tr>
              <th className="text-left p-2 font-light pl-6">Empresa</th>
              <th className="text-left p-2 font-light">Fecha de firma</th>
              <th className="text-left p-2 font-light">Contacto principal</th>
              <th className="text-left p-2 font-light">Agente</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((c) => {
              const idContrato =   `${c.id_contrato ?? 'no_id'}`;

              const idCuenta = c.cuenta_contrato?.id_cuenta_contrato;
              const cuentaSeleccionada = cuentas.find(cta => cta.id_cuenta === idCuenta);
 
              const fechaFirmaRaw =
                c.fecha_firma_contrato ??
                c.fecha_firma_contrato;
              const fechaFirma = formatDateToISO(fechaFirmaRaw); 

              const contactoPrincipalID = c.cuenta_contrato?.id_contacto;
              
              
              const agenteSeleccionado = agentes.find(
                ct => ct.id_agente === cuentaSeleccionada?.id_agente
              );
              
              
              const contactoInfo = contactos.find(
                ct => ct.id_contacto === contactoPrincipalID
              );
            

              return (
                <tr
                  key={idContrato}
                  onClick={(e) => handleRowClick(e, `/dashboard/comercial/contratos/${idContrato}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="p-2 border-b border-gray-200 pl-6">{cuentaSeleccionada?.nombre_empresa }</td>
                  <td className="p-2 border-b border-gray-200">{fechaFirma}</td>
                  <td className="p-2 border-b border-gray-200">{contactoInfo?.nombre_completo_contacto}</td>
                  <td className="p-2 border-b border-gray-200">{agenteSeleccionado?.nombre_completo_agente}</td>
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
