
"use client";

import React, { FC, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from 'next/link';

import EditarDatosGenerales from "./editarProp/editarDatosGenerales";
import EditarDatosAnunciante from "./editarProp/editarDatosAnunciante";
import EditarContenidoPropuesta from "./editarProp/editarContenidoPropuesta";
import EditarOtrosDatosEnFactura from "./editarProp/editarOtrosDatosEnFactura";
import EditarDatosCobro from "./editarProp/editarDatosCobro";

import propuestas from "@/app/contents/propuestasContents.json";
import { InterfazPropuesta, InterfazContacto } from "@/app/interfaces/interfaces";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { FilaContenido } from "./editarProp/editarContenidoPropuesta";
import { DatosGenerales } from "./editarProp/editarDatosGenerales";
import { FormDataFactura } from "./editarProp/editarOtrosDatosEnFactura";
import contactos from "@/app/contents/contactsContents.json";

const EditarPropuesta: FC = () => {
  const parametros = useParams();
  const idPropuestaParametro = parametros?.id_propuesta as string | undefined;
  
  // Estados de editarContenidoPropuesta
  const [importe_antes_descuento, set_importe_antes_descuento] = useState(0);
  const [filas, setFilas] = useState<FilaContenido[]>([]);
  const [filaAEliminar, setFilaAEliminar] = useState<number | null>(null);
  const [showAgregar, setShowAgregar] = useState(false);
  
  // Estados de editarDatosAnunciante
  const [contactoActual, setContactoActual] = useState<InterfazContacto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados de editarDatosCobro
  const [cobros, setCobros] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [cobroAEliminar, setCobroAEliminar] = useState<number | null>(null);
  
  // Estados de editarDatosGenerales
  const [formDataGenerales, setFormDataGenerales] = useState<DatosGenerales>({
    codigoPropuesta: "",
    fechaEnvio: "",
    fechaValidez: "",
    agente: "",
  });
  
  // Estados de editarOtrosDatosEnFactura
  const [formDataFactura, setFormDataFactura] = useState<FormDataFactura>({
    total_previo_propuesta: 0,
    descuento_final_propuesta: 0,
    importe_total_BI_propuesta: 0,
    impuesto: "21",
    importe_propuesta_con_iva: 0,
  });



  const datosPropuestas = propuestas as InterfazPropuesta[];

  const propuestaSeleccionada = datosPropuestas.find(
    (propuesta) => propuesta.id_propuesta === idPropuestaParametro
  );

  // Función auxiliar para formatear fecha
  const formatearFechaAISO = (fecha: string): string => {
    if (!fecha) return "";
    if (fecha.includes("-")) return fecha;
    const [dia, mes, anio] = fecha.split("/");
    if (!dia || !mes || !anio) return "";
    return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  };

  // Inicializar estados cuando se carga la propuesta
  useEffect(() => {
    if (propuestaSeleccionada) {
      // Inicializar filas de contenido
      const contenidoInicial: FilaContenido[] = propuestaSeleccionada.contenido_propuesta.map(
        (item) => ({
          medio: item.medio,
          publicacion: item.publicacion,
          producto: item.producto,
          precio: item.precio_tarifa,
          descuento_unitario: item.descuento_producto,
          precio_unitario: item.precio_unitario,
        })
      );
      setFilas(contenidoInicial);

      // Calcular importe inicial desde las filas
      const sumaInicial = contenidoInicial.reduce(
        (total, fila) => total + Number(fila.precio_unitario || 0),
        0
      );
      set_importe_antes_descuento(sumaInicial);

      // Inicializar contacto actual
      const contacto = contactos.find(
        (c) => c.id_contacto === propuestaSeleccionada.cuenta_propuesta.id_contacto
      ) as InterfazContacto;
      setContactoActual(contacto || null);

      // Inicializar cobros
      if (propuestaSeleccionada.cobros) {
        const cobrosFormateados = propuestaSeleccionada.cobros.map((cobro) => {
          const importe = typeof cobro.importe === "string" 
            ? parseFloat(cobro.importe) 
            : (cobro.importe || 0);
          return {
            numero_cobro: cobro.cobro,
            fecha_cobro: formatearFechaAISO(cobro.fecha),
            importe_cobro: isNaN(importe) ? 0 : importe,
            forma_cobro: propuestaSeleccionada.forma_cobro_propuesta || "Otros",
          };
        });
        setCobros(cobrosFormateados);
      }

      // Inicializar datos generales
      setFormDataGenerales({
        codigoPropuesta: propuestaSeleccionada.id_propuesta,
        fechaEnvio: formatearFechaAISO(propuestaSeleccionada.fecha_envio_propuesta),
        fechaValidez: "",
        agente: propuestaSeleccionada.id_agente_propuesta,
      });

      // Inicializar datos de factura
      const descuentoFinal = propuestaSeleccionada.descuento_final_propuesta || 0;
      const baseImponible = sumaInicial - descuentoFinal;
      const impuesto = propuestaSeleccionada.iva_aplicable ? "21" : "0";
      const precioFinal = impuesto === "21" ? baseImponible * 1.21 : baseImponible;

      setFormDataFactura({
        total_previo_propuesta: sumaInicial,
        descuento_final_propuesta: descuentoFinal,
        importe_total_BI_propuesta: parseFloat(baseImponible.toFixed(2)),
        impuesto: impuesto,
        importe_propuesta_con_iva: parseFloat(precioFinal.toFixed(2)),
      });
    }
  }, [propuestaSeleccionada]);

  // Actualizar importe_antes_descuento cuando cambian las filas
  useEffect(() => {
    const suma_precios_unitarios = filas.reduce(
      (total, fila) => total + Number(fila.precio_unitario || 0),
      0
    );
    set_importe_antes_descuento(suma_precios_unitarios);
  }, [filas]);

  // Actualizar formDataFactura cuando cambia importe_antes_descuento, descuento o impuesto
  useEffect(() => {
    const baseImponible = importe_antes_descuento - formDataFactura.descuento_final_propuesta;
    const precioFinal =
      formDataFactura.impuesto === "21" ? baseImponible * 1.21 : baseImponible;

    setFormDataFactura((prev) => {
      // Solo actualizar si los valores calculados han cambiado
      const newBI = parseFloat(baseImponible.toFixed(2));
      const newIVA = parseFloat(precioFinal.toFixed(2));
      
      if (
        prev.total_previo_propuesta !== importe_antes_descuento ||
        prev.importe_total_BI_propuesta !== newBI ||
        prev.importe_propuesta_con_iva !== newIVA
      ) {
        return {
          ...prev,
          total_previo_propuesta: importe_antes_descuento,
          importe_total_BI_propuesta: newBI,
          importe_propuesta_con_iva: newIVA,
        };
      }
      return prev;
    });
  }, [importe_antes_descuento, formDataFactura.descuento_final_propuesta, formDataFactura.impuesto]);

  if (!propuestaSeleccionada) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-200 text-gray-600 p-12">
        <MiddleNav tituloprincipal={`Editor de propuestas`} />
        <h2 className="text-xl font-semibold mb-4">Propuesta no encontrada</h2>
        <p className="mb-6">
          No se ha encontrado ninguna propuesta con el identificador:{" "}
          <strong>{idPropuestaParametro}</strong>
        </p>
        <div className="flex gap-3">
          <Link
            href="/dashboard/comercial/propuestas"
            className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl"
          >
            Volver a la lista de propuestas
          </Link>
        </div>
      </div>
    );
  }

 

  return (
    <div className="min-h-screen flex flex-col bg-gray-200 text-gray-600  ">
      <MiddleNav tituloprincipal={`Editando propuesta con Código ${propuestaSeleccionada.id_propuesta}`} />

      <div className="flex flex-col px-12">
           <div className="flex flex-row justify-end py-5">
          <div className="flex flex-row justify-end text-right items-right gap-5 text-sm">
            <Link
              href={`/dashboard/comercial/propuestas/${propuestaSeleccionada.id_propuesta}`}
              className="bg-blue-950/80 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900"
            >
              Guardar cambios
            </Link>

            <Link
              href={`/dashboard/comercial/propuestas/${propuestaSeleccionada.id_propuesta}`}
              className="bg-blue-950/80 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900"
            >
              Cancelar
            </Link>

            <Link
              href="/dashboard/comercial/propuestas"
              className="bg-blue-950/80 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900"
            >
              Guardar como nueva
            </Link>
          </div>
        </div>

        <div className="bg-white p-12 rounded-lg">

          <p className="font-bold mb-1 text-gray-500">Datos generales:</p>
          <EditarDatosGenerales
            codigoPropuesta={propuestaSeleccionada.id_propuesta}
            formData={formDataGenerales}
            setFormData={setFormDataGenerales}
          />

          <p className="font-bold mb-1 text-gray-500 mt-6">Datos de contacto:</p>
          <EditarDatosAnunciante
            empresaAnunciante={propuestaSeleccionada.cuenta_propuesta.id_cuenta_propuesta}
            contactoPropuesta={propuestaSeleccionada.cuenta_propuesta.id_contacto}
            contactoActual={contactoActual}
            setContactoActual={setContactoActual}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
          />

          <p className="font-bold mb-1 text-gray-500 mt-6">Contenido en propuesta:</p>
          <EditarContenidoPropuesta
            codigoPropuesta={propuestaSeleccionada.id_propuesta}
            importe_antes_descuento={importe_antes_descuento}
            set_importe_antes_descuento={set_importe_antes_descuento}
            filas={filas}
            setFilas={setFilas}
            filaAEliminar={filaAEliminar}
            setFilaAEliminar={setFilaAEliminar}
            showAgregar={showAgregar}
            setShowAgregar={setShowAgregar}
          />

          <p className="font-bold mb-1 text-gray-500 mt-6">Datos para facturación:</p>
          <EditarOtrosDatosEnFactura
            codigoPropuesta={propuestaSeleccionada.id_propuesta}
            importe_antes_descuento={importe_antes_descuento}
            formData={formDataFactura}
            setFormData={setFormDataFactura}
          />

          <p className="font-bold mb-1 text-gray-500 mt-6">Forma de cobro:</p>
          <EditarDatosCobro
            codigoPropuesta={propuestaSeleccionada.id_propuesta}
            cobros={cobros}
            setCobros={setCobros}
            showModal={showModal}
            setShowModal={setShowModal}
            cobroAEliminar={cobroAEliminar}
            setCobroAEliminar={setCobroAEliminar}
          />
        </div>
      </div>

    </div>
  );
};

export default EditarPropuesta;
