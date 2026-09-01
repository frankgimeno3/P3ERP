'use client';

import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import ContenidoGeneral from './componentesFicha/ContenidoGeneral';
import ContenidoComentarios from './componentesFicha/ContenidoComentarios';
import ContenidoContactosEmpresa from './componentesFicha/cards/ContenidoContactosEmpresa';
import ContenidoDatosAdministrativos from './componentesFicha/ContenidoDatosAdministrativos';
import ContenidoPropuestasCuenta from './componentesFicha/ContenidoPropuestasCuenta';
import ContenidoCuenta from './componentesFicha/ContenidoCuenta';
import RegistroEventosCuenta from './componentesFicha/RegistroEventosCuenta';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import BotonFlotante from '@/app/general_components/componentes_recurrentes/BotonFlotante';
import { InterfazCuenta } from '@/app/interfaces/interfaces';
import { CuentaService } from '@/app/service/CuentaService';
import { AgenteService } from '@/app/service/AgenteService';

interface Comentario {
  id_comentario: string;
  autor: string;
  fecha: string;
  contenido: string;
}

type PestanaCuenta = 'general' | 'comentarios' | 'contactos' | 'propuestas' | 'contratos' | 'contenidos' | 'datos_administrativos' | 'registro_eventos';

const datosComercialesDefault = {
  ciudad_principal_cuenta: '',
  telefono_principal_cuenta: '',
  categoria_principal_cuenta: '',
  contacto_principal: '',
  resumen_actividad_cuenta: '',
};

function mapCuenta(cuentaData: any): InterfazCuenta {
  return {
    id_cuenta: cuentaData.id_cuenta || '',
    nombre_empresa: cuentaData.nombre_empresa || '',
    pais_cuenta: cuentaData.pais_cuenta || '',
    id_agente: cuentaData.id_agente || '',
    id_edisoft: cuentaData.id_edisoft || '',
    asignado_a: cuentaData.asignado_a || '',
    receptor_revista: Boolean(cuentaData.receptor_revista),
    suscriptor_revista: Boolean(cuentaData.suscriptor_revista),
    potencial_actual_relacion: cuentaData.potencial_actual_relacion || '',
    potencial_futuro_encaje: cuentaData.potencial_futuro_encaje || '',
    revisado_ricardo: Boolean(cuentaData.revisado_ricardo),
    campanas: cuentaData.campanas || '',
    estado_leads_frios: cuentaData.estado_leads_frios || '',
    stands_ferias: cuentaData.stands_ferias || '',
    tipo_cuenta: cuentaData.tipo_cuenta || '',
    descripcion_cuenta: cuentaData.descripcion_cuenta || '',
    actividades_cuenta: cuentaData.actividades_cuenta || '',
    descripcion_actividad: cuentaData.descripcion_actividad || '',
    correo_principal: cuentaData.correo_principal || '',
    qq: Boolean(cuentaData.qq),
    presente_en_qq: Boolean(cuentaData.presente_en_qq),
    ferias: Array.isArray(cuentaData.ferias) ? cuentaData.ferias : [],
    red_social_prioritaria: cuentaData.red_social_prioritaria || '',
    catalogos: cuentaData.catalogos || '',
    array_cuentas_distribuidoras: cuentaData.array_cuentas_distribuidoras || [],
    array_cuentas_distribuidas: cuentaData.array_cuentas_distribuidas || [],
    cuenta_agencia: cuentaData.cuenta_agencia || '',
    fuente_novedades_cuenta: cuentaData.fuente_novedades_cuenta || '',
    vat_code: cuentaData.vat_code || '',
    nombre_fiscal: cuentaData.nombre_fiscal || '',
    pais_facturacion: cuentaData.pais_facturacion || '',
    direccion_facturacion: cuentaData.direccion_facturacion || '',
    mail_contabilidad: cuentaData.mail_contabilidad || '',
    poblacion_facturacion: cuentaData.poblacion_facturacion || '',
    cp_facturacion: cuentaData.cp_facturacion || '',
    detalles_facturacion: cuentaData.detalles_facturacion || '',
    facturas_emitidas: cuentaData.facturas_emitidas || [],
    datos_comerciales: cuentaData.datos_comerciales || datosComercialesDefault,
    array_direcciones_cuenta: cuentaData.array_direcciones_cuenta || [],
    array_contactos_cuenta: cuentaData.array_contactos_cuenta || [],
    array_comentarios_cuenta: cuentaData.array_comentarios_cuenta || [],
  };
}

const FichaCliente = () => {
  const params = useParams();

  const id_cuenta = params?.id_cuenta as string;

  const [pestana, setPestana] = useState<PestanaCuenta>('general');
  const [isContenidoEdited, setIsContenidoEdited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [agentes, setAgentes] = useState<any[]>([]);
  
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

        setCuentaEditable(mapCuenta(cuentaData));

        // Cargar comentarios desde los datos de la cuenta
        if (cuentaData.array_comentarios_cuenta && Array.isArray(cuentaData.array_comentarios_cuenta)) {
          const comentariosFormateados = cuentaData.array_comentarios_cuenta.map((c: any) => {
            const agente = agentes.find((a) => a.id_agente === c.id_autor);
            const nombreAutor = agente
              ? agente.nombre_completo_agente || `${agente.nombre_agente || ''} ${agente.apellidos_agente || ''}`.trim()
              : c.id_autor || 'Desconocido';

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
  }, [id_cuenta, agentes]);

  useEffect(() => {
    AgenteService.getAgentes()
      .then((data) => setAgentes(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error('Error fetching agentes:', error);
        setAgentes([]);
      });
  }, []);

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
        setCuentaEditable(mapCuenta(cuentaData));
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

  const tituloCuenta = cuentaEditable.nombre_empresa?.trim() || id_cuenta;

  return (
    <div className="flex flex-col h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal={`Ficha de la cuenta ${tituloCuenta}`} />

      <div className="bg-gray-200 min-h-screen p-12 text-gray-600">
        <div className="flex flex-row justify-between relative">
          <div className='flex flex-row justify-left mt-2'>
            {[
              { key: 'general', label: 'Datos Generales' },
              { key: 'comentarios', label: 'Comentarios' },
              { key: 'contactos', label: 'Contactos' },
              { key: 'propuestas', label: 'Propuestas' },
              { key: 'contratos', label: 'Contratos' },
              { key: 'contenidos', label: 'Contenidos' },
              { key: 'datos_administrativos', label: 'Datos administrativos' },
              { key: 'registro_eventos', label: 'Registro de eventos' },
            ].map(({ key, label }, index) => (
              <div
                key={key}
                className={`p-3 rounded-tr-lg cursor-pointer w-44 text-center text-sm transition-all duration-300
                ${pestana === key
                    ? 'bg-blue-950 text-white z-30 rounded-tl-lg'
                    : 'bg-white text-gray-700 z-10 hover:bg-gray-200'
                  }`}
                style={{ marginLeft: index === 0 ? '0px' : '-5px' }}
                onClick={() => setPestana(key as PestanaCuenta)}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-12 shadow-xl rounded-b-lg">
          {pestana === 'general' && cuentaEditable && (
            <ContenidoGeneral
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

          {pestana === 'contactos' && (
            <ContenidoContactosEmpresa id_cuenta={id_cuenta} />
          )}

          {pestana === 'propuestas' && (
            <div className="space-y-5">
              <div className="rounded bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                Las propuestas son documentos en que se añaden servicios como líneas a un precio, con ciertas especificaciones, para hacer una oferta a un cliente a un precio determinado. Es el documento editable que se usa para hacer la gestión previa a la venta, y cuando el cliente firma, se convierte en un contrato, y cada servicio ofrecido pasa a considerarse un contenido.
              </div>
              <ContenidoPropuestasCuenta id_cuenta={id_cuenta} />
            </div>
          )}

          {pestana === 'contratos' && (
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Contratos</h2>
              <div className="rounded bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                Los contratos son los documentos que registran cada uno de los servicios contratados por un cliente al firmar una propuesta, detallando sus pagos y la cuantía de los mismos. Por la parte de producción, cuando se firma una propuesta, cada línea de la misma se convierte en un contenido que hay que gestionar hasta convertir en un contenido publicado, mientras que por la parte de administración cada contrato genera una o varias facturas por un lado, y una o varias órdenes por otro (cada órden es un pago asociable o no a algunos contenidos, una factura puede subdividirse en varias órdenes). Esto se gestiona desde el módulo de administración.
              </div>
            </div>
          )}

          {pestana === 'contenidos' && (
            <div className="space-y-5">
              <ContenidoCuenta id_cuenta={id_cuenta} />
              <div className="rounded bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                Un contenido es una forma de identificar "algo que se puede publicar a un cliente". Cuando un cliente firma una propuesta, cada fila de la propuesta se convierte en un contenido de pago que se debe gestionar hasta su publicación. Sin embargo, también hay contenidos que recibimos de clientes y procesamos para su publicación gratuita, ya sea para generar contenido de interés en nuestros medios, para buscar fidelizar potenciales clientes o calentar leads, o bien como complemento adicional a una campaña de pago, sin ser un contenido por el que se haya pagado. Cada contenido requiere para ser publicado la aportación de ciertos archivos (imágenes, texto, otros) que denominamos como materiales (cada archivo tiene un id de material propio). Desde el módulo de producción, cada contenido se asocia a una gestión de producción, que nos permite agruparlos (por ejemplo, con unos mismos materiales podemos hacer un artículo en vidrioperfil, uno en una revista de latam, y otro en una revista de españa). Sin embargo, a nivel identificativo, cada contenido es independiente y diferente, pudiendo diferenciar así entre fechas de publicación, versiones, etc. Por último existen también los artículos de revista, una entidad que agrupa el diseño maquetado de un artículo que puede ir en más de una revista, que además tiene un historial de versiones (permitiendo determinar cuál es la versión más nueva y comparar con la anterior para facilitar la revisión de correcciones del cliente o el editor, así como revisar que en revista efectivamente se ha publicado la versión más reciente del mismo).
              </div>
            </div>
          )}

          {pestana === 'datos_administrativos' && (
            <ContenidoDatosAdministrativos
              cuentaEditable={cuentaEditable}
              setCuentaEditable={setCuentaEditable}
              setIsContenidoEdited={setIsContenidoEdited}
            />
          )}

          {pestana === 'registro_eventos' && (
            <RegistroEventosCuenta id_cuenta={id_cuenta} />
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
