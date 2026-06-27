import { useRouter } from 'next/navigation';
import React, { FC } from 'react';

interface OrdenesCobroProps {}

const OrdenesCobro: FC<OrdenesCobroProps> = () => {
  const router = useRouter()
  const columnas = [
    'ORDEN',
    'CLIENTE',
    'CODIGO CRM',
    'AGENTE',
    'FECHA DE COBRO PREVISTA',
    'ESTADO',
    'CONTRATO ASOCIADO',
    'IMPORTE CON IVA',
    'FORMA DE COBRO',
    'FECHA FIRMA CONTRATO',
  ];

  // Mock data
  const data = [
    {
      ORDEN: 'OC-001',
      CLIENTE: 'Empresa Alfa',
      'CODIGO CRM': 'CRM-123',
      AGENTE: 'Juan Pérez',
      'FECHA DE COBRO PREVISTA': '2025-09-20',
      ESTADO: 'Pendiente',
      'CONTRATO ASOCIADO': 'CT-5678',
      'IMPORTE CON IVA': '1.250,00 €',
      'FORMA DE COBRO': 'Transferencia',
      'FECHA FIRMA CONTRATO': '2025-01-15',
    },
    {
      ORDEN: 'OC-002',
      CLIENTE: 'Comercial Beta',
      'CODIGO CRM': 'CRM-456',
      AGENTE: 'María López',
      'FECHA DE COBRO PREVISTA': '2025-09-25',
      ESTADO: 'Pagado',
      'CONTRATO ASOCIADO': 'CT-7890',
      'IMPORTE CON IVA': '3.780,50 €',
      'FORMA DE COBRO': 'Tarjeta',
      'FECHA FIRMA CONTRATO': '2025-02-01',
    },
    {
      ORDEN: 'OC-003',
      CLIENTE: 'Servicios Gamma',
      'CODIGO CRM': 'CRM-789',
      AGENTE: 'Carlos Sánchez',
      'FECHA DE COBRO PREVISTA': '2025-10-01',
      ESTADO: 'En gestión',
      'CONTRATO ASOCIADO': 'CT-2468',
      'IMPORTE CON IVA': '980,00 €',
      'FORMA DE COBRO': 'Efectivo',
      'FECHA FIRMA CONTRATO': '2024-12-20',
    },
  ];

  return (
    <table
      className="min-w-full table-auto border border-gray-100 font-light overflow-scroll"
      style={{ fontSize: '9px' }}
    >
      <thead>
        <tr className="bg-blue-900 text-white">
          {columnas.map((col, idx) => (
            <th key={idx} className="border border-gray-300 px-2 py-2 text-left">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((fila, i) => (
          <tr key={i} className="hover:bg-gray-100 cursor-pointer" onClick={()=>{router.push('/dashboard/administracion/controladministrativo/orden')}}>
            {columnas.map((col, idx) => (
              <td
                key={idx}
                className="border border-gray-300 px-2 py-2 text-gray-700"
              >
                {fila[col as keyof typeof fila]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default OrdenesCobro;
