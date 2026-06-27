'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import ContenidoGeneral from './componentesFicha/ContenidoGeneral';
import ContenidoComentarios from './componentesFicha/ContenidoComentarios';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import BotonFlotante from '@/app/general_components/componentes_recurrentes/BotonFlotante';
import agentes from "@/app/contents/agentesContents.json";
import { InterfazCuenta } from '@/app/interfaces/interfaces';
import { CuentaService } from '@/app/service/CuentaService';

interface Comentario {
  id_comentario: string;
  autor: string;
  fecha: string;
  contenido: string;
}

const FichaCliente = () => {
  const params = useParams();

  const id_cuenta = params?.id_cuenta as string;

  const [pestana, setPestana] = useState<'general' | 'comentarios'>('general');
  const [isContenidoEdited, setIsContenidoEdited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Estados de cuenta (desde ContenidoGeneral)
  const [cuentaEditable, setCuentaEditable] = useState<InterfazCuenta | undefined>(undefined);

  // Estados de comentarios (desde ContenidoComentarios)
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [mostrarInput, setMostrarInput] = useState(false);
  const [modal, setModal] = useState<{
    tipo: "editar" | "borrar" | null;
    comentario?: Comentario;
  }>({ tipo: null });

  // Cargar cuenta desde API
  useEffect(() => {
    const fetchCuenta = async () => {
      if (!id_cuenta) return;
      
      try {
        setLoading(true);
        setError(null);
        const cuentaData = await CuentaService.getCuentaById(id_cuenta);
        
        if (!cuentaData) {
          setError('Cuenta no encontrada');
          setLoading(false);
          return;
        }

        // Mapear datos de la API a la interfaz esperada
        const cuentaMapeada: InterfazCuenta = {
          id_cuenta: cuentaData.id_cuenta || '',
          nombre_empresa: cuentaData.nombre_empresa || '',
          pais_cuenta: cuentaData.pais_cuenta || '',
          id_agente: cuentaData.id_agente || '',
          descripcion_cuenta: cuentaData.descripcion_cuenta || '',
          actividades_cuenta: cuentaData.actividades_cuenta || '',
          presente_en_qq: cuentaData.presente_en_qq || false,
          fuente_novedades_cuenta: cuentaData.fuente_novedades_cuenta || '',
          datos_comerciales: cuentaData.datos_comerciales || {
            ciudad_principal_cuenta: '',
            telefono_principal_cuenta: '',
            categoria_principal_cuenta: '',
            contacto_principal: '',
            resumen_actividad_cuenta: '',
          },
          array_direcciones_cuenta: cuentaData.array_direcciones_cuenta || [],
          array_contactos_cuenta: cuentaData.array_contactos_cuenta || [],
          array_comentarios_cuenta: cuentaData.array_comentarios_cuenta || [],
        };

        setCuentaEditable(cuentaMapeada);

        // Cargar comentarios desde los datos de la cuenta
        if (cuentaData.array_comentarios_cuenta && Array.isArray(cuentaData.array_comentarios_cuenta)) {
          const comentariosFormateados = cuentaData.array_comentarios_cuenta.map((c: any) => {
            const agente = agentes.find((a) => a.id_agente === c.id_autor);
            const nombreAutor = agente ? agente.nombre_agente : c.id_autor || 'Desconocido';

            return {
              id_comentario: c.id_comentario || '',
              autor: nombreAutor,
              fecha: c.fecha_comentario 
                ? new Date(c.fecha_comentario).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : new Date().toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }),
              contenido: c.contenido_comentario || c.contenido || '',
            };
          });
          setComentarios(comentariosFormateados);
        } else {
          setComentarios([]);
        }
      } catch (err: any) {
        console.error('Error fetching cuenta:', err);
        setError(err?.message || 'Error al cargar la cuenta');
      } finally {
        setLoading(false);
      }
    };

    fetchCuenta();
  }, [id_cuenta]);

  const handleSaveChanges = async () => {
    if (!cuentaEditable || !id_cuenta) return;

    try {
      setSaving(true);
      setError(null);
      
      await CuentaService.updateCuenta(id_cuenta, cuentaEditable);
      
      setIsContenidoEdited(false);
      // Opcional: mostrar mensaje de éxito o recargar datos
      // Puedes recargar los datos si quieres asegurarte de tener la versión más reciente
      const cuentaData = await CuentaService.getCuentaById(id_cuenta);
      
      if (cuentaData) {
        const cuentaMapeada: InterfazCuenta = {
          id_cuenta: cuentaData.id_cuenta || '',
          nombre_empresa: cuentaData.nombre_empresa || '',
          pais_cuenta: cuentaData.pais_cuenta || '',
          id_agente: cuentaData.id_agente || '',
          descripcion_cuenta: cuentaData.descripcion_cuenta || '',
          actividades_cuenta: cuentaData.actividades_cuenta || '',
          presente_en_qq: cuentaData.presente_en_qq || false,
          fuente_novedades_cuenta: cuentaData.fuente_novedades_cuenta || '',
          datos_comerciales: cuentaData.datos_comerciales || {
            ciudad_principal_cuenta: '',
            telefono_principal_cuenta: '',
            categoria_principal_cuenta: '',
            contacto_principal: '',
            resumen_actividad_cuenta: '',
          },
          array_direcciones_cuenta: cuentaData.array_direcciones_cuenta || [],
          array_contactos_cuenta: cuentaData.array_contactos_cuenta || [],
          array_comentarios_cuenta: cuentaData.array_comentarios_cuenta || [],
        };
        setCuentaEditable(cuentaMapeada);
      }
    } catch (err: any) {
      console.error('Error saving cuenta:', err);
      setError(err?.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (!id_cuenta) {
    return (
      <div className="flex flex-col h-full min-h-screen text-gray-600">
        <MiddleNav tituloprincipal="Error" />
        <div className="bg-gray-200 min-h-screen p-12">
          <p className="text-red-500">El id_cuenta introducido no corresponde a ninguna cuenta</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-screen text-gray-600">
        <MiddleNav tituloprincipal={`Ficha de la cuenta ${id_cuenta}`} />
        <div className="bg-gray-200 min-h-screen p-12 flex justify-center items-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Cargando cuenta...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !cuentaEditable) {
    return (
      <div className="flex flex-col h-full min-h-screen text-gray-600">
        <MiddleNav tituloprincipal={`Ficha de la cuenta ${id_cuenta}`} />
        <div className="bg-gray-200 min-h-screen p-12">
          <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg">
            <p className="text-center">{error || 'Cuenta no encontrada'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal={`Ficha de la cuenta ${id_cuenta}`} />

      <div className="bg-gray-200 min-h-screen p-12 text-gray-600">
        <div className="flex flex-row justify-between  relative">
          <div className='flex flex-row justify-left mt-2'>
            {[
              { key: 'general', label: 'Datos Generales' },
              { key: 'comentarios', label: 'Comentarios' },
            ].map(({ key, label }, index) => (
              <div
                key={key}
                className={`p-3 rounded-tr-lg cursor-pointer w-60 text-center transition-all duration-300
                ${pestana === key
                    ? 'bg-gray-100 z-30 rounded-tl-lg'
                    : 'bg-blue-950 text-white z-10 hover:bg-blue-950/80'
                  }`}
                style={{ marginLeft: index === 0 ? '0px' : '-5px' }}
                onClick={() => setPestana(key as typeof pestana)}
              >
                {label}
              </div>
            ))}
          </div>
          <div className="flex flex-row gap-4 mb-4 items-center">
            <Link
              href={`/dashboard/comercial/propuestas/cuentas/${id_cuenta}`}
              className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900"
            >
              <p>Propuestas</p>
            </Link>
          </div>
        </div>

        <div className="bg-white p-12 shadow-xl rounded-b-lg">
          {pestana === 'general' && cuentaEditable && (
            <ContenidoGeneral
              id_cuenta={id_cuenta}
              cuentaEditable={cuentaEditable}
              setCuentaEditable={setCuentaEditable}
              setIsContenidoEdited={setIsContenidoEdited}
            />
          )}

          {pestana === 'comentarios' && (
            <ContenidoComentarios 
              id_cuenta={id_cuenta}
              comentarios={comentarios}
              setComentarios={setComentarios}
              nuevoComentario={nuevoComentario}
              setNuevoComentario={setNuevoComentario}
              mostrarInput={mostrarInput}
              setMostrarInput={setMostrarInput}
              modal={modal}
              setModal={setModal}
            />
          )}
        </div>
      </div>

      <BotonFlotante 
        isContenidoEdited={isContenidoEdited} 
        onSave={handleSaveChanges}
        disabled={saving}
      />
    </div>
  );
};

export default FichaCliente;
