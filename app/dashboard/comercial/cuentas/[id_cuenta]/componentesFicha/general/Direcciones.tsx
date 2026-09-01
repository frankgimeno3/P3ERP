'use client';

import React, { FC, useEffect, useState } from 'react';
import ModalAnadirDireccion from './modals/modalsDirecciones/ModalAnadirDireccion';
import ModalEditarDireccion from './modals/modalsDirecciones/ModalEditarDireccion';
import ModalBorrarDireccion from './modals/modalsDirecciones/ModalBorrarDireccion';

interface Direccion {
  nombre_direccion: string;
  pais_direccion: string;
  region_direccion: string;
  ciudad_direccion: string;
  codigo_postal: string;
  direccion_completa: string;
  telefono_direccion: string;
  descripcion_direccion: string;
}

interface DireccionesProps {
  direcciones: Direccion[];
  receptorRevista: boolean;
  suscriptorRevista: boolean;
  onReceptorRevistaChange: (value: boolean) => void;
  onSuscriptorRevistaChange: (value: boolean) => void;
  onChange: (updatedDirecciones: Direccion[]) => void;
}

const columns: { key: keyof Direccion; label: string }[] = [
  { key: 'nombre_direccion', label: 'Nombre dirección' },
  { key: 'pais_direccion', label: 'País' },
  { key: 'region_direccion', label: 'Región' },
  { key: 'ciudad_direccion', label: 'Ciudad' },
  { key: 'codigo_postal', label: 'Código postal' },
  { key: 'direccion_completa', label: 'Dirección completa' },
  { key: 'telefono_direccion', label: 'Teléfono' },
  { key: 'descripcion_direccion', label: 'Descripción' },
];

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex w-32 items-center rounded-full border p-1 text-xs font-medium transition ${
        value ? 'border-blue-950 bg-blue-950 text-white' : 'border-gray-300 bg-gray-100 text-gray-600'
      }`}
    >
      <span className={`w-1/2 text-center ${value ? 'opacity-60' : 'rounded-full bg-white py-1 text-blue-950'}`}>No</span>
      <span className={`w-1/2 text-center ${value ? 'rounded-full bg-white py-1 text-blue-950' : 'opacity-60'}`}>Sí</span>
    </button>
  );
}

const Direcciones: FC<DireccionesProps> = ({
  direcciones: initialDirecciones,
  receptorRevista,
  suscriptorRevista,
  onReceptorRevistaChange,
  onSuscriptorRevistaChange,
  onChange,
}) => {
  const [direcciones, setDirecciones] = useState(initialDirecciones);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [direccionEdit, setDireccionEdit] = useState<Direccion | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [direccionDelete, setDireccionDelete] = useState<Direccion | null>(null);

  useEffect(() => {
    setDirecciones(initialDirecciones);
  }, [initialDirecciones]);

  const handleAdd = (newDir: Direccion) => {
    const updated = [...direcciones, newDir];
    setDirecciones(updated);
    setIsAddOpen(false);
    onChange(updated);
  };

  const handleEdit = (updatedDir: Direccion) => {
    if (!direccionEdit) return;
    const updated = direcciones.map((direccion) => (direccion === direccionEdit ? updatedDir : direccion));
    setDirecciones(updated);
    setIsEditOpen(false);
    setDireccionEdit(null);
    onChange(updated);
  };

  const handleDelete = (dir: Direccion) => {
    const updated = direcciones.filter((direccion) => direccion !== dir);
    setDirecciones(updated);
    setIsDeleteOpen(false);
    setDireccionDelete(null);
    onChange(updated);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-row justify-between">
        <h2 className="text-xl font-bold">Direcciones y envío de revista física</h2>
        <button
          type="button"
          className="cursor-pointer rounded-lg bg-blue-950/80 p-2 px-4 text-sm text-white shadow-xl hover:bg-blue-950/70"
          onClick={() => setIsAddOpen(true)}
        >
          +
        </button>
      </div>

      <div className="grid gap-4 rounded bg-gray-50 p-4 text-sm md:grid-cols-2">
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium">Receptor Revista</span>
          <YesNoToggle value={receptorRevista} onChange={onReceptorRevistaChange} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium">Suscriptor revista?</span>
          <YesNoToggle value={suscriptorRevista} onChange={onSuscriptorRevistaChange} />
        </div>
      </div>

      {direcciones.length === 0 && (
        <p className="text-gray-500">No hay direcciones registradas para esta cuenta.</p>
      )}

      {direcciones.map((direccion, idx) => (
        <table key={idx} className="min-w-full overflow-hidden rounded border border-gray-300 bg-white text-xs shadow-sm">
          <thead className="bg-blue-950/80 text-white">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="p-2 text-left font-light">{column.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-100/30">
              {columns.map((column) => (
                <td key={column.key} className="border-b p-2">{direccion[column.key] || '-'}</td>
              ))}
              <td className="flex flex-row justify-end gap-3 p-2">
                <button
                  type="button"
                  className="cursor-pointer rounded-lg bg-blue-950/80 p-2 px-4 text-xs text-white shadow-xl hover:bg-blue-950/70"
                  onClick={() => {
                    setDireccionEdit(direccion);
                    setIsEditOpen(true);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={`rounded-lg p-2 px-4 text-xs text-white shadow-xl ${
                    direcciones.length === 1 ? 'cursor-not-allowed bg-gray-400' : 'cursor-pointer bg-red-600 hover:bg-red-700'
                  }`}
                  onClick={() => {
                    setDireccionDelete(direccion);
                    setIsDeleteOpen(true);
                  }}
                  disabled={direcciones.length === 1}
                >
                  X
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      ))}

      <ModalAnadirDireccion isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onConfirm={handleAdd} />

      {direccionEdit && (
        <ModalEditarDireccion
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          direccion={direccionEdit}
          onConfirm={handleEdit}
        />
      )}

      {direccionDelete && (
        <ModalBorrarDireccion
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          direccion={direccionDelete}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default Direcciones;
