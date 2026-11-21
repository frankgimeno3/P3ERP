'use client';

import { useParams } from 'next/navigation';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ContenidoGeneral from './componentesFicha/ContenidoGeneral';
import { CuentaHeader } from './componentesFicha/general/IdentidadCuenta';
import ContenidoFeriasCuenta from './componentesFicha/ContenidoFeriasCuenta';
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
import AccountTasks from '@/app/components/tasks/AccountTasks';

interface Comentario {
  id_comentario: string;
  autor: string;
  fecha: string;
  contenido: string;
}

type PestanaCuenta = 'general' | 'comentarios' | 'contactos' | 'propuestas' | 'ferias' | 'contratos' | 'contenidos' | 'tareas' | 'datos_administrativos' | 'general_eventos';

const datosComercialesDefault = {
  ciudad_principal_cuenta: '',
  telefono_principal_cuenta: '',
  categoria_principal_cuenta: '',
  contacto_principal: '',
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
    campanas: cuentaData.campanas || '',
    stands_ferias: cuentaData.stands_ferias || '',
    stands_ferias_ediciones: Array.isArray(cuentaData.stands_ferias_ediciones) ? cuentaData.stands_ferias_ediciones : [],
    tipo_cuenta: cuentaData.tipo_cuenta || '',
    descripcion_cuenta: cuentaData.descripcion_cuenta || '',
    actividades_cuenta: cuentaData.actividades_cuenta || '',
    descripcion_actividad: cuentaData.descripcion_actividad || '',
    correo_principal: cuentaData.correo_principal || '',
    seguimiento_qq: cuentaData.seguimiento_qq || "",
    canal_youtube: cuentaData.canal_youtube || "",
    presente_en_qq: Boolean(cuentaData.presente_en_qq),
    ferias: Array.isArray(cuentaData.ferias) ? cuentaData.ferias : [],
    redes_sociales: Array.isArray(cuentaData.redes_sociales) ? cuentaData.redes_sociales : [],
    catalogos: cuentaData.catalogos || '',
    catalogos_enlaces: cuentaData.catalogos_enlaces || [],
    array_cuentas_distribuidoras: cuentaData.array_cuentas_distribuidoras || [],
    array_cuentas_distribuidas: cuentaData.array_cuentas_distribuidas || [],
    cuenta_agencia: cuentaData.cuenta_agencia || '',
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
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Estados de cuenta (desde ContenidoGeneral)
  const [cuentaEditable, setCuentaEditable] = useState<InterfazCuenta | undefined>(undefined);
  const savedAccount = useRef<InterfazCuenta>(undefined);

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
    const request = new AbortController();
    savedAccount.current = undefined;
    setIsContenidoEdited(false);
    setErrorGuardado(null);
    const fetchCuenta = async () => {
      if (!id_cuenta) return;
      
      try {
        setLoading(true);
        setError(null);
        const [cuentaData, agentData] = await Promise.all([
          CuentaService.getCuentaById(id_cuenta, { signal: request.signal }),
          AgenteService.getAgentes().catch(() => []),
        ]);
        if (request.signal.aborted) return;
        const agentes = Array.isArray(agentData) ? agentData : [];
        
        if (!cuentaData) {
          setError('Cuenta no encontrada');
          setLoading(false);
          return;
        }

        const account = mapCuenta(cuentaData);
        savedAccount.current = account;
        setCuentaEditable(account);

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
        if (request.signal.aborted) return;
        console.error('Error fetching cuenta:', err);
        setError(err?.message || 'Error al cargar la cuenta');
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    };

    fetchCuenta();
    return () => request.abort();
  }, [id_cuenta]);

  useEffect(() => {
    if (!isContenidoEdited || saving) return;
    const cancelEdits = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !savedAccount.current) return;
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
      setCuentaEditable(savedAccount.current);
      setIsContenidoEdited(false);
      setErrorGuardado(null);
    };
    window.addEventListener('keydown', cancelEdits, true);
    return () => window.removeEventListener('keydown', cancelEdits, true);
  }, [isContenidoEdited, saving]);

  const handleSaveChanges = async () => {
    if (!cuentaEditable || !id_cuenta) return;

    try {
      setSaving(true);
      setErrorGuardado(null);
      
      const persisted = await CuentaService.updateCuenta(id_cuenta, { ...cuentaEditable, preservar_contacto_principal: true });
      
      setIsContenidoEdited(false);
      // Opcional: mostrar mensaje de éxito o recargar datos
      // Puedes recargar los datos si quieres asegurarte de tener la versión más reciente
      const cuentaData = await CuentaService.getCuentaById(id_cuenta).catch(() => ({
        ...persisted,
        redes_sociales: savedAccount.current?.redes_sociales,
      }));
      
      if (cuentaData) {
        const account = mapCuenta(cuentaData);
        savedAccount.current = account;
        setCuentaEditable(account);
      }
    } catch (err: any) {
      console.error('Error saving cuenta:', err);
      setErrorGuardado(err?.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const syncPrincipal = useCallback((contacto_principal: string) => {
    const withPrincipal = (prev?: InterfazCuenta) => prev && ({
      ...prev,
      datos_comerciales: { ...prev.datos_comerciales, contacto_principal },
    });
    savedAccount.current = withPrincipal(savedAccount.current);
    setCuentaEditable(withPrincipal);
  }, []);

  const syncSocialProfiles = useCallback((redes_sociales: NonNullable<InterfazCuenta['redes_sociales']>) => {
    const withProfiles = (prev?: InterfazCuenta) => prev && { ...prev, redes_sociales };
    savedAccount.current = withProfiles(savedAccount.current);
    setCuentaEditable(withProfiles);
  }, []);

  if (!id_cuenta) {
    return (
      <div className="flex flex-col h-full min-h-screen text-gray-600">
        <MiddleNav tituloprincipal="Error" />
        <div className="bg-gray-200 min-h-screen p-12">
          <p className="text-red-700">El id_cuenta introducido no corresponde a ninguna cuenta</p>
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

  const seccion = pestana === 'tareas' ? 'tareas' : ['general','datos_administrativos','comentarios','contactos','propuestas','ferias'].includes(pestana) ? 'comercial' : 'gestion';

  return (
    <div className="flex flex-col h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Ficha de la cuenta" />

      <div className="bg-gray-200 min-h-screen p-12 text-gray-600">
        {errorGuardado && <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-100 p-4 text-red-700">{errorGuardado}</p>}
        <div className="mb-4 py-2">
          <CuentaHeader key={cuentaEditable.id_cuenta}
            data={{ ...cuentaEditable, asignado_a: cuentaEditable.asignado_a || '' }}
            onChange={(field, value) => {
              setCuentaEditable(prev => prev && { ...prev, [field]: value });
              setIsContenidoEdited(true);
            }}
          />
        </div>
        <div role="tablist" aria-label="Secciones de la cuenta" className="flex flex-wrap gap-2">
          {[
            { key: 'comercial', label: 'Datos Comerciales', first: 'general' },
            { key: 'gestion', label: 'Datos de gestión', first: 'contratos' },
            { key: 'tareas', label: 'Tareas', first: 'tareas' },
          ].map(({ key, label, first }) => (
            <button key={key} type="button" role="tab" aria-selected={seccion === key}
              onClick={() => setPestana(first as PestanaCuenta)}
              className={`cursor-pointer rounded-t-lg px-5 py-3 text-sm transition-colors duration-200 ${seccion === key ? 'bg-blue-950 text-white hover:bg-blue-900' : 'bg-white text-gray-700 hover:bg-blue-50'}`}>
              {label}
            </button>
          ))}
        </div>
        {seccion !== 'tareas' && <div role="tablist" aria-label={seccion === 'comercial' ? 'Datos Comerciales' : 'Datos de gestión'} className="flex flex-wrap items-end gap-1 border-b border-blue-200 bg-slate-100 px-3 pt-3">
          {(seccion === 'comercial' ? [
            { key: 'general', label: 'Datos generales' },
            { key: 'datos_administrativos', label: 'Datos administrativos' },
            { key: 'comentarios', label: 'Comentarios' },
            { key: 'contactos', label: 'Contactos' },
            { key: 'propuestas', label: 'Propuestas' },
            { key: 'ferias', label: 'Ferias' },
          ] : [
            { key: 'contratos', label: 'Contratos' },
            { key: 'contenidos', label: 'Contenidos' },
            { key: 'general_eventos', label: 'Registro de eventos' },
          ]).map(({ key, label }) => (
            <button key={key} type="button" role="tab" aria-selected={pestana === key}
              onClick={() => setPestana(key as PestanaCuenta)}
              className={`relative -mb-px cursor-pointer rounded-t-lg border px-4 py-2.5 text-sm transition-colors ${pestana === key ? 'z-10 border-blue-200 border-b-white bg-white font-bold text-blue-950 shadow-[0_-3px_0_#172554] hover:bg-blue-50' : 'border-transparent bg-slate-200 text-gray-600 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>}

        <div className="bg-white p-12 shadow-xl rounded-b-lg">
          {pestana === 'tareas' && <AccountTasks accountId={id_cuenta} />}
          {pestana === 'ferias' && (
            <ContenidoFeriasCuenta
              key={cuentaEditable.id_cuenta}
              idCuenta={cuentaEditable.id_cuenta}
              seleccionadas={cuentaEditable.ferias || []}
              stands={cuentaEditable.stands_ferias_ediciones || []}
              legacyStands={cuentaEditable.stands_ferias || ''}
              onFeriasChange={ferias => {
                setCuentaEditable(prev => prev && { ...prev, ferias });
                setIsContenidoEdited(true);
              }}
              onStandsChange={stands_ferias_ediciones => {
                setCuentaEditable(prev => prev && { ...prev, stands_ferias_ediciones });
                setIsContenidoEdited(true);
              }}
            />
          )}
          {pestana === 'general' && cuentaEditable && (
            <ContenidoGeneral
              cuentaEditable={cuentaEditable}
              setCuentaEditable={setCuentaEditable}
              setIsContenidoEdited={setIsContenidoEdited}
              onOpenContactos={() => setPestana('contactos')}
              onRedesSocialesSaved={syncSocialProfiles}
              renewalAssignmentKey={JSON.stringify([savedAccount.current?.id_agente, savedAccount.current?.asignado_a])}
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
            <ContenidoContactosEmpresa key={cuentaEditable.id_cuenta} id_cuenta={cuentaEditable.id_cuenta} onPrincipalChange={syncPrincipal} />
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

          {pestana === 'general_eventos' && (
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
