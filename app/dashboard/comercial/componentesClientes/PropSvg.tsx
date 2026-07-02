import React, { FC } from 'react';

interface PropSvgProps {}

const PropSvg: FC<PropSvgProps> = () => {
  return (
    <svg
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-10 h-10 text-gray-700 cursor-pointer"
    >
      {/* Fondo del documento */}
      <rect x="10" y="10" width="100" height="120" rx="10" fill="white" stroke="currentColor" strokeWidth="2" />

      {/* Encabezado decorativo */}
      <rect x="20" y="20" width="80" height="12" rx="3" fill="currentColor" className="opacity-90" />

      {/* Líneas de texto */}
      <rect x="20" y="40" width="70" height="6" rx="2" fill="currentColor" className="opacity-70" />
      <rect x="20" y="50" width="60" height="6" rx="2" fill="currentColor" className="opacity-60" />
      <rect x="20" y="62" width="72" height="6" rx="2" fill="currentColor" className="opacity-50" />
      <rect x="20" y="74" width="65" height="6" rx="2" fill="currentColor" className="opacity-50" />

      {/* Totales */}
      <rect x="20" y="95" width="40" height="6" rx="2" fill="currentColor" className="opacity-80" />
      <rect x="70" y="95" width="30" height="6" rx="2" fill="currentColor" className="opacity-80" />

      {/* Firma / Pie */}
      <rect x="20" y="110" width="50" height="5" rx="2" fill="currentColor" className="opacity-30" />
    </svg>
  );
};

export default PropSvg;
