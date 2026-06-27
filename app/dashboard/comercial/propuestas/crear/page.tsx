"use client"

import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import React, { FC, useState } from 'react';
import Fase1Crear from './fases/fase1Crear';
import Fase2Crear from './fases/fase2Crear';
import Fase3Crear from './fases/fase3Crear';
import Fase4Crear from './fases/fase4Crear';
import Fase5Crear from './fases/fase5Crear';

interface Producto {
  medio: string;
  publicacion: string;
  producto: string;
  precioTarifa: number;
  precioOfrecido: number | "";
  fechaPublicacion: string;
  descuento_unitario?: number;
  precio_unitario?: number;
}

interface ContactoPersonalizado {
  nombre_completo: string;
  email: string;
}

interface Cobro {
  formaCobro: "Recibo" | "Transferencia bancaria" | "Otro";
  otroEspecificacion?: string;
  banco?: "Banco Santander" | "Banco Sabadell";
  fechaCobro: string;
  importeCobro: number | "";
}

interface CrearPropuestasProps {
  
}

const CrearPropuestas: FC<CrearPropuestasProps> = ({ }) => {
  // Estados generales
  const [faseCreacionPropuesta, setFaseCreacionPropuesta] = useState(1);
  
  // Fase 1: Selección de cuenta
  const [codigoCliente, setCodigoCliente] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  
  // Fase 2: Selección de contacto
  const [contactoAnunciante, setContactoAnunciante] = useState("");
  const [contactoFirmante, setContactoFirmante] = useState("");
  const [contactoPersonalizado, setContactoPersonalizado] = useState<ContactoPersonalizado | null>(null);
  
  // Fase 3: Productos
  const [productos, setProductos] = useState<Producto[]>([]);
  
  // Fase 4: Configuración de pago
  const [nombreFactura, setNombreFactura] = useState("");
  const [direccionFactura, setDireccionFactura] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [estadoZona, setEstadoZona] = useState("");
  const [pais, setPais] = useState("");
  const [vat, setVat] = useState("");
  const [baseImponible, setBaseImponible] = useState("");
  const [impuesto, setImpuesto] = useState("");
  const [precioTotal, setPrecioTotal] = useState("");
  const [cobros, setCobros] = useState<Cobro[]>([]);
  
  // Fase 5: Revisión final
  const [nombrePropuesta, setNombrePropuesta] = useState("");
  const [comentariosAdicionales, setComentariosAdicionales] = useState("");

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal={` Crear propuesta `} />

      <div className="bg-white min-h-screen p-12 text-gray-600">
        {faseCreacionPropuesta == 1 && (
          <Fase1Crear 
            setFaseCreacionPropuesta={setFaseCreacionPropuesta} 
            setCodigoCliente={setCodigoCliente} 
            codigoCliente={codigoCliente}
            setSelectedCliente={setSelectedCliente}
            selectedCliente={selectedCliente}
          />
        )}
        {faseCreacionPropuesta == 2 && (
          <Fase2Crear 
            setFaseCreacionPropuesta={setFaseCreacionPropuesta}  
            setCodigoContactoFirmante={setContactoFirmante} 
            setCodigoContactoAnunciante={setContactoAnunciante}
            codigoCliente={codigoCliente}
            contactoAnunciante={contactoAnunciante}
            contactoFirmante={contactoFirmante}
            contactoPersonalizado={contactoPersonalizado}
            setContactoPersonalizado={setContactoPersonalizado}
          />
        )}
        {faseCreacionPropuesta == 3 && (
          <Fase3Crear 
            setFaseCreacionPropuesta={setFaseCreacionPropuesta}
            productos={productos}
            setProductos={setProductos}
          />
        )}
        {faseCreacionPropuesta == 4 && (
          <Fase4Crear 
            setFaseCreacionPropuesta={setFaseCreacionPropuesta}
            codigoCliente={codigoCliente}
            productos={productos}
            nombreFactura={nombreFactura}
            setNombreFactura={setNombreFactura}
            direccionFactura={direccionFactura}
            setDireccionFactura={setDireccionFactura}
            codigoPostal={codigoPostal}
            setCodigoPostal={setCodigoPostal}
            estadoZona={estadoZona}
            setEstadoZona={setEstadoZona}
            pais={pais}
            setPais={setPais}
            vat={vat}
            setVat={setVat}
            baseImponible={baseImponible}
            setBaseImponible={setBaseImponible}
            impuesto={impuesto}
            setImpuesto={setImpuesto}
            precioTotal={precioTotal}
            setPrecioTotal={setPrecioTotal}
            cobros={cobros}
            setCobros={setCobros}
          />
        )}
        {faseCreacionPropuesta == 5 && (
          <Fase5Crear 
            setFaseCreacionPropuesta={setFaseCreacionPropuesta}
            nombrePropuesta={nombrePropuesta}
            setNombrePropuesta={setNombrePropuesta}
            comentariosAdicionales={comentariosAdicionales}
            setComentariosAdicionales={setComentariosAdicionales}
            codigoCliente={codigoCliente}
            selectedCliente={selectedCliente}
            contactoAnunciante={contactoAnunciante}
            contactoFirmante={contactoFirmante}
            contactoPersonalizado={contactoPersonalizado}
            productos={productos}
            nombreFactura={nombreFactura}
            direccionFactura={direccionFactura}
            codigoPostal={codigoPostal}
            estadoZona={estadoZona}
            pais={pais}
            vat={vat}
            baseImponible={baseImponible}
            impuesto={impuesto}
            precioTotal={precioTotal}
            cobros={cobros}
          />
        )}
      </div>
    </div>
  );
};

export default CrearPropuestas;
