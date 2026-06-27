import React, { FC } from 'react';
 
interface CampanasAdministrativasProps {}

const CampanasAdministrativas: FC<CampanasAdministrativasProps> = () => {
  const columnas = [
    'CÓDIGO CAMPAÑA',
    'ULTIMA ACTUALIZACIÓN',
    'IMPORTE ACUMULADO BI',
    'VALOR BI CAMPAÑA ANTERIOR',
    'AÑO CAMPAÑA ANTERIOR',
    'NOMBRE CLIENTE',
    'CODIGO CRM',
    'AÑO INICIO CAMPAÑA ACTUAL',
    'TERMINA AÑO 2026?',
    'CONTRATOS ASOCIADOS',
  ];

  return (
 
         <table className="min-w-full table-auto border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {columnas.map((col, idx) => (
                <th key={idx} className="border px-4 py-2 text-left text-sm font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Aquí puedes mapear tus datos si los tienes */}
            <tr>
              {columnas.map((_, idx) => (
                <td key={idx} className="border px-4 py-2 text-sm text-gray-700">
                  {/* Valor de muestra */}
                  -
                </td>
              ))}
            </tr>
          </tbody>
        </table>
     );
};

export default CampanasAdministrativas;
