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
    <label className="flex min-h-40 min-w-0 flex-col">
      <span className="mb-1 text-sm font-medium">Descripción y comentarios generales fijados</span>
      <textarea
        value={descripcion}
        onChange={handleChange}
        className="min-h-32 w-full flex-1 rounded border p-2 focus:outline-none focus:ring focus:ring-blue-400"
        placeholder="Escribe una descripción o comentario general fijado..."
      />
    </label>
  );
};

export default Descripcion;
