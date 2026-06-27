import { useRouter } from 'next/navigation';
import React, { FC, useMemo } from 'react';
import DetallePublicacion from '../crearComponents/DetallePublicacion';
import data from '@/app/contents/publicacionesContents.json';

interface Fase1Props {
  publicacionSeleccionada: string;
  nombreContenido: string;
  setNombreContenido: (value: string) => void;
  tipoContenido: string;
  setTipoContenido: (value: string) => void;
  especificaciones: string;
  setEspecificaciones: (value: string) => void;
}

const Fase1: FC<Fase1Props> = ({
  nombreContenido,
  setNombreContenido,
  publicacionSeleccionada,
  tipoContenido,
  setTipoContenido,
  especificaciones,
  setEspecificaciones
}) => {
  const router = useRouter();

  const isFormValid = nombreContenido && tipoContenido && especificaciones;

   const publicacion = useMemo(() => {
    return data.find((item) => item.id_publicacion === publicacionSeleccionada);
  }, [publicacionSeleccionada]);

  const handleSubmit = () => {
    if (!isFormValid) return;
    router.push(`/dashboard/produccion/servicios `);
  };

  return (
    <div className="p-10 px-8   bg-white rounded-2xl shadow-md max-w-9xl mx-auto text-center">
      <h2 className="text-2xl font-semibold mb-4 pt-10">
        Publicación seleccionada:
      </h2>
      <p className='mb-12 italic'>{publicacion ? publicacion.nombre_publicacion : "No encontrada"}</p>
      <DetallePublicacion publicacionSeleccionada={publicacionSeleccionada} />

      <div className="pb-4  rounded shadow-xl space-y-2 text-left bg-gray-100/30">
        <p className='text-white italic bg-blue-950 w-full py-4 px-8 '>Configurar el nuevo contenido</p>
        <div className='flex flex-col px-8  '>

          <form className="flex flex-col gap-4 mt-6 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-600">Nombre del contenido</label>
              <input
                type="text"
                value={nombreContenido}
                onChange={(e) => setNombreContenido(e.target.value)}
                className="w-full p-2 border border-gray-100 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">Tipo de contenido</label>
              <input
                type="text"
                value={tipoContenido}
                onChange={(e) => setTipoContenido(e.target.value)}
                className="w-full p-2 border border-gray-100 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">Especificaciones</label>
              <textarea
                value={especificaciones}
                onChange={(e) => setEspecificaciones(e.target.value)}
                className="w-full p-2 border border-gray-100 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
          </form>

          <button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`mt-6 w-full py-2 rounded-2xl text-white transition-all cursor-pointer ${isFormValid
                ? "bg-blue-900 opacity-100 hover:bg-blue-800"
                : "bg-blue-900 opacity-50 cursor-not-allowed"
              }`}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Fase1;
