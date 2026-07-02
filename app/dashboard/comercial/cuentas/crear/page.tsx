"use client";

import React, { FC, useState } from 'react';
import Fase0 from './fasesc/fase0';
import Fase1 from './fasesc/fase1';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

const CrearCuenta: FC = () => {
  const [faseCrearCuenta, setFaseCrearCuenta] = useState(1);

  // Comprobación Edisoft
  const [codigoEdisoft, setCodigoEdisoft] = useState('');
  const [noExisteEdisoft, setNoExisteEdisoft] = useState(false);
  const [cuentaExiste, setCuentaExiste] = useState<null | boolean>(null);

  // Datos de la cuenta
  const [nombreCuenta, setNombreCuenta] = useState('');
  const [agenteAsignado, setAgenteAsignado] = useState('');
  const [paisCuenta, setPaisCuenta] = useState('');
  const [telefonoCuenta, setTelefonoCuenta] = useState('');
  const [descripcionCuenta, setDescripcionCuenta] = useState('');

  // Dirección
  const [paisUbicacion, setPaisUbicacion] = useState('');
  const [estadoUbicacion, setEstadoUbicacion] = useState('');
  const [ciudadUbicacion, setCiudadUbicacion] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [direccionCompleta, setDireccionCompleta] = useState('');
  const [telefonoPrincipal, setTelefonoPrincipal] = useState('');
  const [descripcionUbicacion, setDescripcionUbicacion] = useState('');

  // Contacto
  const [nombreContacto, setNombreContacto] = useState('');
  const [apellidosContacto, setApellidosContacto] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [mailContacto, setMailContacto] = useState('');

  return (
    <div className="flex flex-col h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal={` Crear cuenta `} />
      <div className="bg-gray-100 h-full min-h-screen p-12 text-gray-600">
        {faseCrearCuenta === 1 && (
          <Fase0
            setFaseCrearCuenta={setFaseCrearCuenta}
            codigoEdisoft={codigoEdisoft}
            setCodigoEdisoft={setCodigoEdisoft}
            noExisteEdisoft={noExisteEdisoft}
            setNoExisteEdisoft={setNoExisteEdisoft}
            cuentaExiste={cuentaExiste}
            setCuentaExiste={setCuentaExiste}
            nombreCuenta={nombreCuenta}
            setNombreCuenta={setNombreCuenta}
            agenteAsignado={agenteAsignado}
            setAgenteAsignado={setAgenteAsignado}
            paisCuenta={paisCuenta}
            setPaisCuenta={setPaisCuenta}
            telefonoCuenta={telefonoCuenta}
            setTelefonoCuenta={setTelefonoCuenta}
            descripcionCuenta={descripcionCuenta}
            setDescripcionCuenta={setDescripcionCuenta}
            paisUbicacion={paisUbicacion}
            setPaisUbicacion={setPaisUbicacion}
            estadoUbicacion={estadoUbicacion}
            setEstadoUbicacion={setEstadoUbicacion}
            ciudadUbicacion={ciudadUbicacion}
            setCiudadUbicacion={setCiudadUbicacion}
            codigoPostal={codigoPostal}
            setCodigoPostal={setCodigoPostal}
            direccionCompleta={direccionCompleta}
            setDireccionCompleta={setDireccionCompleta}
            telefonoPrincipal={telefonoPrincipal}
            setTelefonoPrincipal={setTelefonoPrincipal}
            descripcionUbicacion={descripcionUbicacion}
            setDescripcionUbicacion={setDescripcionUbicacion}
            nombreContacto={nombreContacto}
            setNombreContacto={setNombreContacto}
            apellidosContacto={apellidosContacto}
            setApellidosContacto={setApellidosContacto}
            telefonoContacto={telefonoContacto}
            setTelefonoContacto={setTelefonoContacto}
            mailContacto={mailContacto}
            setMailContacto={setMailContacto}
          />
        )}
        {faseCrearCuenta === 2 && (
          <Fase1
            setFaseCrearCuenta={setFaseCrearCuenta}
            codigoEdisoft={codigoEdisoft}
            noExisteEdisoft={noExisteEdisoft}
            nombreCuenta={nombreCuenta}
            agenteAsignado={agenteAsignado}
            paisCuenta={paisCuenta}
            telefonoCuenta={telefonoCuenta}
            descripcionCuenta={descripcionCuenta}
            paisUbicacion={paisUbicacion}
            estadoUbicacion={estadoUbicacion}
            ciudadUbicacion={ciudadUbicacion}
            codigoPostal={codigoPostal}
            direccionCompleta={direccionCompleta}
            telefonoPrincipal={telefonoPrincipal}
            descripcionUbicacion={descripcionUbicacion}
            nombreContacto={nombreContacto}
            apellidosContacto={apellidosContacto}
            telefonoContacto={telefonoContacto}
            mailContacto={mailContacto}
          />
        )}
      </div>
    </div>
  );
};

export default CrearCuenta;
