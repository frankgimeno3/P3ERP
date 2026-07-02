'use client';
import React, { FC, ChangeEvent } from 'react';

interface DescripcionProps {
  descripcion: string;
  onChange: (value: string) => void;
}

const Descripcion: FC<DescripcionProps> = ({ descripcion, onChange }) => {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Descripción</h2>
      <textarea
        value={descripcion}
        onChange={handleChange}
        className="w-full h-40 p-2 border rounded focus:outline-none focus:ring focus:ring-blue-400"
        placeholder="Escribe una descripción..."
      />
    </div>
  );
};

export default Descripcion;
