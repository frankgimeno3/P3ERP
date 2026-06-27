import React, { FC, useState, useEffect, useMemo } from "react";
import cuentasContents from "@/app/contents/cuentasContents.json";

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

interface Cobro {
  formaCobro: "Transferencia bancaria"  | "Recibo" | "Otro";
  otroEspecificacion?: string;
  banco?: "Banco Santander" | "Banco Sabadell";
  fechaCobro: string;
  importeCobro: number | "";
}

interface Fase4CrearProps {
  setFaseCreacionPropuesta: (fase: number) => void;
  codigoCliente: string;
  productos: Producto[];
  nombreFactura: string;
  setNombreFactura: (value: string) => void;
  direccionFactura: string;
  setDireccionFactura: (value: string) => void;
  codigoPostal: string;
  setCodigoPostal: (value: string) => void;
  estadoZona: string;
  setEstadoZona: (value: string) => void;
  pais: string;
  setPais: (value: string) => void;
  vat: string;
  setVat: (value: string) => void;
  baseImponible: string;
  setBaseImponible: (value: string) => void;
  impuesto: string;
  setImpuesto: (value: string) => void;
  precioTotal: string;
  setPrecioTotal: (value: string) => void;
  cobros: Cobro[];
  setCobros: React.Dispatch<React.SetStateAction<Cobro[]>>;
}

const Fase4Crear: FC<Fase4CrearProps> = ({
  setFaseCreacionPropuesta,
  codigoCliente,
  productos,
  nombreFactura,
  setNombreFactura,
  direccionFactura,
  setDireccionFactura,
  codigoPostal,
  setCodigoPostal,
  estadoZona,
  setEstadoZona,
  pais,
  setPais,
  vat,
  setVat,
  baseImponible,
  setBaseImponible,
  impuesto,
  setImpuesto,
  precioTotal,
  setPrecioTotal,
  cobros,
  setCobros,
}) => {
  // Calcular base imponible desde productos
  const baseImponibleCalculada = useMemo(() => {
    return productos.reduce((sum, producto) => {
      const precio = typeof producto.precioOfrecido === "number" 
        ? producto.precioOfrecido 
        : (producto.precio_unitario || producto.precioTarifa || 0);
      return sum + precio;
    }, 0);
  }, [productos]);

  // Actualizar base imponible cuando cambian los productos
  useEffect(() => {
    setBaseImponible(baseImponibleCalculada.toFixed(2));
  }, [baseImponibleCalculada, setBaseImponible]);

  // Calcular precio total basado en base imponible e impuesto (impuesto se SUMA)
  const precioTotalCalculado = useMemo(() => {
    const base = parseFloat(baseImponible) || 0;
    const impuestoPorcentaje = parseFloat(impuesto) || 0;
    const impuestoCalculado = base * (impuestoPorcentaje / 100);
    return (base + impuestoCalculado).toFixed(2);
  }, [baseImponible, impuesto]);

  // Actualizar precio total cuando cambian base o impuesto
  useEffect(() => {
    setPrecioTotal(precioTotalCalculado);
  }, [precioTotalCalculado, setPrecioTotal]);

  // Calcular importe total de cobros
  const importeTotalCobros = useMemo(() => {
    return cobros.reduce((sum, cobro) => {
      const importe = typeof cobro.importeCobro === "number" ? cobro.importeCobro : 0;
      return sum + importe;
    }, 0);
  }, [cobros]);

  // Calcular diferencia entre precio total e importe de cobros
  const diferenciaCobros = useMemo(() => {
    const precioTotalNum = parseFloat(precioTotal) || 0;
    return precioTotalNum - importeTotalCobros;
  }, [precioTotal, importeTotalCobros]);

  // Auto-completar con datos de la cuenta cuando se carga el componente
  useEffect(() => {
    if (codigoCliente) {
      const cuenta = (cuentasContents as any[]).find(c => c.id_cuenta === codigoCliente);
      if (cuenta) {
        // Auto-completar datos de facturación solo si están vacíos
        if (!nombreFactura && cuenta.nombre_empresa) {
          setNombreFactura(cuenta.nombre_empresa);
        }
        if (cuenta.array_direcciones_cuenta && cuenta.array_direcciones_cuenta.length > 0) {
          const direccion = cuenta.array_direcciones_cuenta[0];
          if (!direccionFactura && direccion.direccion_completa) {
            setDireccionFactura(direccion.direccion_completa);
          }
          if (!codigoPostal && direccion.codigo_postal) {
            setCodigoPostal(direccion.codigo_postal);
          }
          if (!estadoZona && direccion.region_direccion) {
            setEstadoZona(direccion.region_direccion);
          }
          if (!pais && direccion.pais_direccion) {
            setPais(direccion.pais_direccion);
          }
        }
        // Auto-completar VAT si existe en la cuenta
        if (!vat && cuenta.vat_code) {
          setVat(cuenta.vat_code);
        } else if (!vat && cuenta.cif) {
          setVat(cuenta.cif);
        } else if (!vat && cuenta.codigo_fiscal) {
          setVat(cuenta.codigo_fiscal);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoCliente]);

  // Calcular impuesto en número
  const impuestoCalculado = useMemo(() => {
    const base = parseFloat(baseImponible) || 0;
    const impuestoPorcentaje = parseFloat(impuesto) || 0;
    return (base * (impuestoPorcentaje / 100)).toFixed(2);
  }, [baseImponible, impuesto]);

  const handleAgregarCobro = () => {
    const nuevoCobro: Cobro = {
      formaCobro: "Recibo",
      banco: "Banco Sabadell",
      fechaCobro: "",
      importeCobro: "",
    };
    setCobros([...cobros, nuevoCobro]);
  };

  const handleEliminarCobro = (index: number) => {
    const nuevosCobros = cobros.filter((_, i) => i !== index);
    setCobros(nuevosCobros);
  };

  const handleCobroChange = (index: number, field: keyof Cobro, value: any) => {
    const nuevosCobros = [...cobros];
    const cobro = { ...nuevosCobros[index] };
    
    if (field === "formaCobro") {
      cobro.formaCobro = value;
      // Si es Recibo, auto-seleccionar Sabadell
      if (value === "Recibo") {
        cobro.banco = "Banco Sabadell";
      }
      // Si es Otro, limpiar banco
      if (value === "Otro") {
        cobro.banco = undefined;
      }
      // Si es Transferencia, no hacer nada (el usuario elegirá)
    } else {
      (cobro as any)[field] = value;
    }
    
    nuevosCobros[index] = cobro;
    setCobros(nuevosCobros);
  };

  // Validar que todos los cobros estén completos
  const cobrosValidos = useMemo(() => {
    return cobros.every(cobro => {
      return cobro.formaCobro && 
             cobro.fechaCobro && 
             (typeof cobro.importeCobro === "number" && cobro.importeCobro > 0) &&
             (cobro.formaCobro !== "Otro" || cobro.otroEspecificacion) &&
             (cobro.formaCobro !== "Transferencia bancaria" || cobro.banco);
    });
  }, [cobros]);

  // Validar que los importes sumen el precio total
  const importesValidos = useMemo(() => {
    const precioTotalNum = parseFloat(precioTotal) || 0;
    return Math.abs(diferenciaCobros) < 0.01; // Tolerancia de 0.01 para errores de redondeo
  }, [precioTotal, diferenciaCobros]);

  // Validar campos obligatorios
  const camposFacturacion = {
    nombreFactura,
    direccionFactura,
    codigoPostal,
    estadoZona,
    pais,
    vat,
  };

  const camposFaltantes = useMemo(() => {
    const faltantes: string[] = [];
    if (!camposFacturacion.nombreFactura.trim()) faltantes.push("nombreFactura");
    if (!camposFacturacion.direccionFactura.trim()) faltantes.push("direccionFactura");
    if (!camposFacturacion.codigoPostal.trim()) faltantes.push("codigoPostal");
    if (!camposFacturacion.estadoZona.trim()) faltantes.push("estadoZona");
    if (!camposFacturacion.pais.trim()) faltantes.push("pais");
    if (!camposFacturacion.vat.trim()) faltantes.push("vat");
    if (!impuesto || impuesto.trim() === "") faltantes.push("impuesto");
    return faltantes;
  }, [camposFacturacion, impuesto]);

  const canConfirmar = camposFaltantes.length === 0 && 
                       baseImponible && 
                       impuesto && 
                       cobros.length > 0 &&
                       cobrosValidos &&
                       importesValidos;

  // Función para obtener clase CSS según si el campo está vacío
  const getInputClassName = (fieldName: string) => {
    const baseClass = "border rounded p-2";
    if (camposFaltantes.includes(fieldName)) {
      return `${baseClass} bg-yellow-100 text-yellow-800`;
    }
    return baseClass;
  };

  // Función para obtener clase CSS de campos de cobro según si están vacíos
  const getCobroInputClassName = (cobro: Cobro, field: "fechaCobro" | "importeCobro" | "otroEspecificacion") => {
    const baseClass = "border rounded p-2";
    let isEmpty = false;
    if (field === "fechaCobro") {
      isEmpty = !cobro.fechaCobro;
    } else if (field === "importeCobro") {
      isEmpty = typeof cobro.importeCobro !== "number" || cobro.importeCobro <= 0;
    } else if (field === "otroEspecificacion") {
      isEmpty = cobro.formaCobro === "Otro" && (!cobro.otroEspecificacion || !cobro.otroEspecificacion.trim());
    }
    if (isEmpty) {
      return `${baseClass} bg-yellow-100 text-yellow-800`;
    }
    return baseClass;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Botón Volver */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setFaseCreacionPropuesta(3)}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400"
        >
          ← Volver a Fase 3
        </button>
      </div>

      <div className="flex flex-row gap-6">
        {/* Datos para facturación */}
        <div className="flex-1 border p-4 rounded-xl space-y-4">
          <p className="font-semibold bg-blue-950 text-white p-2">Datos para facturación:</p>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">Nombre en factura</label>
              <input
                type="text"
                placeholder="Nombre en factura"
                className={getInputClassName("nombreFactura")}
                value={nombreFactura}
                onChange={(e) => setNombreFactura(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">Dirección en factura</label>
              <input
                type="text"
                placeholder="Dirección en factura"
                className={getInputClassName("direccionFactura")}
                value={direccionFactura}
                onChange={(e) => setDireccionFactura(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">Código Postal</label>
              <input
                type="text"
                placeholder="Código Postal"
                className={getInputClassName("codigoPostal")}
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">Estado/Zona</label>
              <input
                type="text"
                placeholder="Estado/Zona"
                className={getInputClassName("estadoZona")}
                value={estadoZona}
                onChange={(e) => setEstadoZona(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">País</label>
              <input
                type="text"
                placeholder="País"
                className={getInputClassName("pais")}
                value={pais}
                onChange={(e) => setPais(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">VAT CODE / CIF / CÓDIGO FISCAL</label>
              <input
                type="text"
                placeholder="VAT CODE / CIF / CÓDIGO FISCAL"
                className={getInputClassName("vat")}
                value={vat}
                onChange={(e) => setVat(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">Base imponible</label>
              <input
                type="text"
                className="border rounded p-2 bg-gray-100"
                value={baseImponible}
                readOnly
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">Impuesto (%)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Impuesto %"
                  className={`${getInputClassName("impuesto")} flex-1`}
                  value={impuesto}
                  onChange={(e) => setImpuesto(e.target.value)}
                  min="0"
                  max="100"
                />
                <span className="text-sm text-gray-600 min-w-[80px]">
                  {impuestoCalculado}€
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">Precio total</label>
              <input
                type="text"
                className="border rounded p-2 bg-gray-100"
                value={precioTotal}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Forma de cobro */}
        <div className="flex-1 border p-4 rounded-xl space-y-4">
          <p className="font-semibold bg-blue-950 text-white p-2">Forma de cobro:</p>
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">Número de cobros</label>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    if (cobros.length > 0) {
                      setCobros(cobros.slice(0, -1));
                    }
                  }}
                  className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={cobros.length === 0}
                >
                  -
                </button>
                <span className="px-4 py-2 border rounded min-w-[60px] text-center">
                  {cobros.length}
                </span>
                <button
                  onClick={handleAgregarCobro}
                  className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  +
                </button>
              </div>
            </div>

            {/* Cards de cobros */}
            <div className="space-y-3">
              {cobros.map((cobro, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Cobro {index + 1}</h4>
                    {cobros.length > 1 && (
                      <button
                        onClick={() => handleEliminarCobro(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Forma de cobro</label>
                    <select
                      className="border rounded p-2"
                      value={cobro.formaCobro}
                      onChange={(e) => handleCobroChange(index, "formaCobro", e.target.value as Cobro["formaCobro"])}
                    >
                      <option value="Recibo">Recibo</option>
                      <option value="Transferencia bancaria">Transferencia bancaria</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  {cobro.formaCobro === "Otro" && (
                    <div className="flex flex-col">
                      <label className="text-sm font-semibold mb-1">Especificar forma de cobro</label>
                      <input
                        type="text"
                        placeholder="Especificar forma de cobro"
                        className={getCobroInputClassName(cobro, "otroEspecificacion")}
                        value={cobro.otroEspecificacion || ""}
                        onChange={(e) => handleCobroChange(index, "otroEspecificacion", e.target.value)}
                      />
                    </div>
                  )}

                  {(cobro.formaCobro === "Transferencia bancaria" || cobro.formaCobro === "Recibo") && (
                    <div className="flex flex-col">
                      <label className="text-sm font-semibold mb-1">Banco</label>
                      <select
                        className="border rounded p-2"
                        value={cobro.banco || ""}
                        onChange={(e) => handleCobroChange(index, "banco", e.target.value as Cobro["banco"])}
                        disabled={cobro.formaCobro === "Recibo"}
                      >
                        <option value="Banco Santander">Banco Santander</option>
                        <option value="Banco Sabadell">Banco Sabadell</option>
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Fecha de cobro</label>
                    <input
                      type="date"
                      className={getCobroInputClassName(cobro, "fechaCobro")}
                      value={cobro.fechaCobro}
                      onChange={(e) => handleCobroChange(index, "fechaCobro", e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Importe de cobro</label>
                    <input
                      type="number"
                      placeholder="Importe de cobro"
                      className={getCobroInputClassName(cobro, "importeCobro")}
                      value={cobro.importeCobro}
                      onChange={(e) => handleCobroChange(index, "importeCobro", e.target.value === "" ? "" : parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Mostrar diferencia si los importes no suman el precio total */}
            {cobros.length > 0 && !importesValidos && (
              <div className={`p-3 rounded ${diferenciaCobros > 0 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                <p className="text-sm font-semibold">
                  {diferenciaCobros > 0 
                    ? `Faltan ${diferenciaCobros.toFixed(2)}€ para alcanzar el precio total`
                    : `Sobran ${Math.abs(diferenciaCobros).toFixed(2)}€ sobre el precio total`}
                </p>
              </div>
            )}

            {/* Resumen de importes */}
            {cobros.length > 0 && (
              <div className="p-3 bg-gray-100 rounded">
                <p className="text-sm">
                  <span className="font-semibold">Total importes:</span> {importeTotalCobros.toFixed(2)}€
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Precio total:</span> {parseFloat(precioTotal || "0").toFixed(2)}€
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botón Confirmar */}
      <div>
        <button
          disabled={!canConfirmar}
          className={`bg-blue-500 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-600 ${
            !canConfirmar ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={() => canConfirmar && setFaseCreacionPropuesta(5)}
        >
          Confirmar y pasar a revisión final
        </button>
      </div>
    </div>
  );
};

export default Fase4Crear;
