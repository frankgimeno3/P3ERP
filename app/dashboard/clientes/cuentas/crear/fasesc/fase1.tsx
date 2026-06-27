"use client";

import React, { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {CuentaService} from '@/app/service/CuentaService';

interface Agente {
  id_usuario: string;
  nombre_usuario: string;
  rol: string;
}

interface Fase1Props {
  setFaseCrearCuenta: React.Dispatch<React.SetStateAction<number>>;
  codigoEdisoft: string;
  noExisteEdisoft: boolean;
  nombreCuenta: string;
  agenteAsignado: string;
  paisCuenta: string;
  telefonoCuenta: string;
  descripcionCuenta: string;
  paisUbicacion: string;
  estadoUbicacion: string;
  ciudadUbicacion: string;
  codigoPostal: string;
  direccionCompleta: string;
  telefonoPrincipal: string;
  descripcionUbicacion: string;
  nombreContacto: string;
  apellidosContacto: string;
  telefonoContacto: string;
  mailContacto: string;
}

const Fase1: FC<Fase1Props> = ({
  setFaseCrearCuenta,
  codigoEdisoft,
  noExisteEdisoft,
  nombreCuenta,
  agenteAsignado,
  paisCuenta,
  telefonoCuenta,
  descripcionCuenta,
  paisUbicacion,
  estadoUbicacion,
  ciudadUbicacion,
  codigoPostal,
  direccionCompleta,
  telefonoPrincipal,
  descripcionUbicacion,
  nombreContacto,
  apellidosContacto,
  telefonoContacto,
  mailContacto,
}) => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [cuentaCreada, setCuentaCreada] = useState(false);
  const [createdCuentaId, setCreatedCuentaId] = useState<string | null>(null);
  const [loadingTime, setLoadingTime] = useState(0);

  const agentes: Agente[] = [
    { id_usuario: '', nombre_usuario: 'Seleccione un agente asignado', rol: 'Obligatorio' },
    { id_usuario: 'usr_25_00008', nombre_usuario: 'Jose Luis Fernandez Llop', rol: 'Agente' },
    { id_usuario: 'usr_25_00003', nombre_usuario: 'Carlos David Ortega', rol: 'Empleado' },
    { id_usuario: 'usr_25_00004', nombre_usuario: 'Carlos Lamiel', rol: 'Empleado' },
    { id_usuario: 'usr_25_00005', nombre_usuario: 'Frank Admin', rol: 'Superadmin' },
    { id_usuario: 'usr_25_00006', nombre_usuario: 'Frank Auxiliar', rol: 'Empleado' },
    { id_usuario: 'usr_25_00007', nombre_usuario: 'Gimeno Auxiliar', rol: 'Agente' },
    { id_usuario: 'usr_25_00001', nombre_usuario: 'Montserrat Valencia', rol: 'Administrativo' },
    { id_usuario: 'usr_25_00002', nombre_usuario: 'Ricardo Calleja', rol: 'Moderador' },
  ];

  const agenteNombre = agentes.find(a => a.id_usuario === agenteAsignado)?.nombre_usuario || agenteAsignado;

  const handleCrearCuenta = async () => {
    setIsCreating(true);
    try {
      // Generate id_cuenta if not provided
      let idCuenta = codigoEdisoft;
      if (noExisteEdisoft || !codigoEdisoft) {
        // Generate a unique ID - you might want to use a better ID generation strategy
        const timestamp = Date.now();
        idCuenta = `625${timestamp.toString().slice(-5)}`;
      }

      // Build datos_comerciales
      const datosComerciales = {
        ciudad_principal_cuenta: ciudadUbicacion || '',
        telefono_principal_cuenta: telefonoPrincipal || telefonoCuenta || '',
        categoria_principal_cuenta: '', // Not collected in form, can be added later
        contacto_principal: '', // Will be set after contact creation if needed
        resumen_actividad_cuenta: descripcionCuenta || '',
      };

      // Build array_direcciones_cuenta
      const direccion = {
        nombre_direccion: 'Dirección Principal',
        pais_direccion: paisUbicacion || '',
        region_direccion: estadoUbicacion || '',
        ciudad_direccion: ciudadUbicacion || '',
        codigo_postal: codigoPostal || '',
        direccion_completa: direccionCompleta || '',
        telefono_direccion: telefonoPrincipal || '',
        descripcion_direccion: descripcionUbicacion || '',
      };
      const arrayDirecciones = [direccion];

      // Build array_contactos_cuenta (if contact info is provided)
      const arrayContactos = [];
      if (nombreContacto || apellidosContacto || telefonoContacto || mailContacto) {
        // Generate a contact ID - you might want to use a better ID generation strategy
        const contactId = `contact_25_${Date.now().toString().padStart(11, '0')}`;
        arrayContactos.push({ id_contacto: contactId });
        
        // Update contacto_principal in datos_comerciales
        datosComerciales.contacto_principal = contactId;
      }

      // Build the cuenta data object
      const cuentaData = {
        id_cuenta: idCuenta,
        nombre_empresa: nombreCuenta,
        pais_cuenta: paisCuenta,
        id_agente: agenteAsignado,
        descripcion_cuenta: descripcionCuenta || '',
        actividades_cuenta: '', // Not collected in form, can be added later
        presente_en_qq: false, // Default value
        fuente_novedades_cuenta: '', // Not collected in form, can be added later
        datos_comerciales: datosComerciales,
        array_direcciones_cuenta: arrayDirecciones,
        array_contactos_cuenta: arrayContactos,
        array_comentarios_cuenta: [], // Empty initially
      };

      const createdCuenta = await CuentaService.createCuenta(cuentaData);
      setCreatedCuentaId(createdCuenta.id_cuenta || idCuenta);
      setCuentaCreada(true);
    } catch (error) {
      console.error('Error creating cuenta:', error);
      alert(error?.message || 'Error al crear la cuenta. Por favor, inténtelo de nuevo.');
      setIsCreating(false);
    }
  };

  const handleIrAFicha = () => {
    // Redirect to the account detail page
    const idCuenta = createdCuentaId || (noExisteEdisoft || !codigoEdisoft 
      ? `625${Date.now().toString().slice(-5)}` 
      : codigoEdisoft);
    router.push(`/dashboard/clientes/cuentas/${idCuenta}`);
  };

  return (
    <div className="p-10 px-8 md:px-56 bg-white rounded-2xl shadow-md max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold mb-6 pt-4 text-center">Revisar datos antes de crear la cuenta</h2>

      {!cuentaCreada ? (
        <>
          <div className="flex flex-col gap-6 mb-8">
            {/* Comprobación Edisoft */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Comprobación en Edisoft</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Estado:</span> {noExisteEdisoft ? 'No existe en Edisoft' : `Código: ${codigoEdisoft || 'No especificado'}`}</p>
              </div>
            </div>

            {/* Datos de la cuenta */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Datos de la cuenta</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Nombre:</span> {nombreCuenta || 'No especificado'}</p>
                <p><span className="font-medium">Agente asignado:</span> {agenteNombre || 'No especificado'}</p>
                <p><span className="font-medium">País:</span> {paisCuenta || 'No especificado'}</p>
                <p><span className="font-medium">Teléfono:</span> {telefonoCuenta || 'No especificado'}</p>
                {descripcionCuenta && <p><span className="font-medium">Descripción:</span> {descripcionCuenta}</p>}
              </div>
            </div>

            {/* Dirección */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Dirección principal</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">País:</span> {paisUbicacion || 'No especificado'}</p>
                <p><span className="font-medium">Teléfono principal:</span> {telefonoPrincipal || 'No especificado'}</p>
                {estadoUbicacion && <p><span className="font-medium">Estado:</span> {estadoUbicacion}</p>}
                {ciudadUbicacion && <p><span className="font-medium">Ciudad:</span> {ciudadUbicacion}</p>}
                {codigoPostal && <p><span className="font-medium">Código postal:</span> {codigoPostal}</p>}
                {direccionCompleta && <p><span className="font-medium">Dirección:</span> {direccionCompleta}</p>}
                {descripcionUbicacion && <p><span className="font-medium">Descripción:</span> {descripcionUbicacion}</p>}
              </div>
            </div>

            {/* Contacto */}
            {(nombreContacto || apellidosContacto || telefonoContacto || mailContacto) && (
              <div className="pb-4">
                <h3 className="text-lg font-semibold mb-3">Contacto principal</h3>
                <div className="space-y-2 text-sm">
                  {nombreContacto && <p><span className="font-medium">Nombre:</span> {nombreContacto}</p>}
                  {apellidosContacto && <p><span className="font-medium">Apellidos:</span> {apellidosContacto}</p>}
                  {telefonoContacto && <p><span className="font-medium">Teléfono:</span> {telefonoContacto}</p>}
                  {mailContacto && <p><span className="font-medium">Email:</span> {mailContacto}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setFaseCrearCuenta(1)}
              disabled={isCreating}
              className={`px-6 py-3 rounded-lg transition ${
                isCreating
                  ? "bg-gray-400 text-white opacity-50 cursor-not-allowed"
                  : "bg-gray-500 text-white hover:bg-gray-600 cursor-pointer"
              }`}
            >
              Volver atrás
            </button>
            <button
              onClick={handleCrearCuenta}
              disabled={isCreating}
              className={`px-6 py-3 rounded-lg transition ${
                isCreating
                  ? "bg-blue-400 text-white opacity-50 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
              }`}
            >
              {isCreating ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>

          {/* Loading */}
          {isCreating && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-600">Creando cuenta, por favor espere...</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-green-700 mb-2">Cuenta creada con éxito</h3>
            <p className="text-gray-600 mb-6">La cuenta ha sido creada correctamente.</p>
          </div>
          <button
            onClick={handleIrAFicha}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition cursor-pointer"
          >
            Ir a la ficha de la cuenta
          </button>
        </div>
      )}
    </div>
  );
};

export default Fase1;
