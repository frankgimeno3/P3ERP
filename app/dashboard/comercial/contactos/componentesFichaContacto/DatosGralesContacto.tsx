import { InterfazContacto } from '@/app/interfaces/interfaces';
import React, { FC, ChangeEvent } from 'react';
 
interface DatosGralesContactoProps {
  contacto: InterfazContacto;
  setContactoEditable: React.Dispatch<React.SetStateAction<InterfazContacto | undefined>>;
  onChange: () => void;
}

const DatosGralesContacto: FC<DatosGralesContactoProps> = ({ contacto, setContactoEditable, onChange }) => {
  const handleChange = (field: keyof InterfazContacto, value: string) => {
    setContactoEditable(prev => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      // Actualizar nombre_completo_contacto si cambia nombre o apellidos
      if (field === 'nombre_contacto' || field === 'apellidos_contacto') {
        updated.nombre_completo_contacto = `${updated.nombre_contacto} ${updated.apellidos_contacto}`;
      }
      return updated;
    });
    onChange();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Datos generales del contacto</h2>
      <table className="min-w-full">
        <thead className="bg-blue-950/80 text-white">
          <tr>
            <th className="text-left p-2 font-light">Nombre del contacto</th>
            <th className="text-left p-2 font-light">Apellidos del contacto</th>
            <th className="text-left p-2 font-light">Id del contacto</th>
            <th className="text-left p-2 font-light">Teléfono principal</th>
            <th className="text-left p-2 font-light">Email principal</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-200 hover:bg-gray-100/30">
            <td className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={contacto.nombre_contacto}
                onChange={(e) => handleChange('nombre_contacto', e.target.value)}
                className="w-full border border-gray-200 rounded p-1"
              />
            </td>
            <td className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={contacto.apellidos_contacto}
                onChange={(e) => handleChange('apellidos_contacto', e.target.value)}
                className="w-full border border-gray-200 rounded p-1"
              />
            </td>
            <td className="p-2 border-b border-gray-200">{contacto.id_contacto}</td>
            <td className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={contacto.telefono_contacto}
                onChange={(e) => handleChange('telefono_contacto', e.target.value)}
                className="w-full border border-gray-200 rounded p-1"
              />
            </td>
            <td className="p-2 border-b border-gray-200">
              <input
                type="email"
                value={contacto.email_contacto}
                onChange={(e) => handleChange('email_contacto', e.target.value)}
                className="w-full border border-gray-200 rounded p-1"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default DatosGralesContacto;
