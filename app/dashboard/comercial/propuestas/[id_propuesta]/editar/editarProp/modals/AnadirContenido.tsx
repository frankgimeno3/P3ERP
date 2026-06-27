  import React, { FC, useState, useEffect, useMemo } from "react";
import { FilaContenido } from "../editarContenidoPropuesta";
import serviciosData from "@/app/contents/ServiciosContents.json";

interface Servicio {
  id_servicio: string;
  medio_servicio_es: string;
  edicion_servicio_es: string;
  publicacion_servicio_es: string;
  nombre_servicio_es: string;
  precio_servicio: string;
}

interface AnadirContenidoProps {
  onClose: () => void;
  onAgregar: (nuevaFila: FilaContenido) => void;
}

type Fase = "medio" | "edicion" | "producto" | "descuento" | "confirmacion";

const AnadirContenido: FC<AnadirContenidoProps> = ({ onClose, onAgregar }) => {
  const servicios = serviciosData as Servicio[];
  
  const [fase, setFase] = useState<Fase>("medio");
  const [medioSeleccionado, setMedioSeleccionado] = useState<string>("");
  const [edicionSeleccionada, setEdicionSeleccionada] = useState<string>("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Servicio | null>(null);
  const [descuento, setDescuento] = useState<number>(0);
  const [mostrarDescuento, setMostrarDescuento] = useState<boolean>(false);
  
  const [nuevaFila, setNuevaFila] = useState<FilaContenido>({
    medio: "",
    publicacion: "",
    producto: "",
    precio: 0,
    descuento_unitario: 0,
    precio_unitario: 0
  });

  // Obtener medios únicos
  const mediosUnicos = useMemo(() => {
    const medios = new Set(servicios.map(s => s.medio_servicio_es));
    return Array.from(medios).sort();
  }, []);

  // Obtener ediciones únicas para el medio seleccionado
  const edicionesUnicas = useMemo(() => {
    if (!medioSeleccionado) return [];
    const ediciones = new Set(
      servicios
        .filter(s => s.medio_servicio_es === medioSeleccionado)
        .map(s => s.edicion_servicio_es)
    );
    return Array.from(ediciones).sort();
  }, [medioSeleccionado]);

  // Obtener productos únicos para el medio y edición seleccionados
  const productosUnicos = useMemo(() => {
    if (!medioSeleccionado || !edicionSeleccionada) return [];
    return servicios.filter(
      s => s.medio_servicio_es === medioSeleccionado && 
           s.edicion_servicio_es === edicionSeleccionada
    );
  }, [medioSeleccionado, edicionSeleccionada]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleMedioSelect = (medio: string) => {
    setMedioSeleccionado(medio);
    setEdicionSeleccionada("");
    setProductoSeleccionado(null);
    setFase("edicion");
  };

  const handleEdicionSelect = (edicion: string) => {
    setEdicionSeleccionada(edicion);
    setProductoSeleccionado(null);
    setFase("producto");
  };

  const handleProductoSelect = (producto: Servicio) => {
    setProductoSeleccionado(producto);
    // Extraer precio numérico (remover € y comas)
    const precioStr = producto.precio_servicio.replace(/[€,]/g, "").trim();
    const precio = parseFloat(precioStr) || 0;
    
    setNuevaFila({
      medio: producto.medio_servicio_es,
      publicacion: producto.publicacion_servicio_es,
      producto: producto.nombre_servicio_es,
      precio: precio,
      descuento_unitario: 0,
      precio_unitario: precio
    });
    setFase("descuento");
  };

  const handleDescuentoChange = (valor: number) => {
    setDescuento(valor);
    if (productoSeleccionado) {
      const precioStr = productoSeleccionado.precio_servicio.replace(/[€,]/g, "").trim();
      const precio = parseFloat(precioStr) || 0;
      const precioConDescuento = precio * (1 - valor / 100);
      
      setNuevaFila({
        ...nuevaFila,
        descuento_unitario: valor,
        precio_unitario: precioConDescuento
      });
    }
  };

  const handleConfirmar = () => {
    onAgregar(nuevaFila);
  };

  const renderFase = () => {
    switch (fase) {
      case "medio":
        return (
          <div className="space-y-4 p-5">
            <h3 className="text-md font-semibold mb-4">Selecciona un medio</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {mediosUnicos.map((medio) => (
                <button
                  key={medio}
                  onClick={() => handleMedioSelect(medio)}
                  className="cursor-pointer w-full text-left px-4 py-2 border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-500 transition-colors"
                >
                  {medio}
                </button>
              ))}
            </div>
          </div>
        );

      case "edicion":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => {
                  setFase("medio");
                  setMedioSeleccionado("");
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Volver
              </button>
              <h3 className="text-md font-semibold">Medio: {medioSeleccionado}</h3>
            </div>
            <h3 className="text-md font-semibold mb-4">Selecciona una edición</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {edicionesUnicas.map((edicion) => (
                <button
                  key={edicion}
                  onClick={() => handleEdicionSelect(edicion)}
                  className="cursor-pointer w-full text-left px-4 py-2 border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-500 transition-colors"
                >
                  {edicion}
                </button>
              ))}
            </div>
          </div>
        );

      case "producto":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => {
                  setFase("edicion");
                  setEdicionSeleccionada("");
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Volver
              </button>
              <div className="text-sm text-gray-600">
                <div>Medio: {medioSeleccionado}</div>
                <div>Edición: {edicionSeleccionada}</div>
              </div>
            </div>
            <h3 className="text-md font-semibold mb-4">Selecciona un producto</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {productosUnicos.map((producto) => (
                <button
                  key={producto.id_servicio}
                  onClick={() => handleProductoSelect(producto)}
                  className="cursor-pointer w-full text-left px-4 py-2 border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-500 transition-colors"
                >
                  <div className="font-medium">{producto.nombre_servicio_es}</div>
                  <div className="text-sm text-gray-600">
                    {producto.publicacion_servicio_es} - {producto.precio_servicio}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case "descuento":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => {
                  setFase("producto");
                  setProductoSeleccionado(null);
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Volver
              </button>
            </div>
            <h3 className="text-md font-semibold mb-4">¿Deseas añadir un descuento?</h3>
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1">Descuento unitario (%)</label>
                <input
                  type="number"
                  value={descuento}
                  onChange={(e) => {
                    const desc = parseFloat(e.target.value) || 0;
                    handleDescuentoChange(desc);
                    setMostrarDescuento(desc > 0);
                  }}
                  className="border border-gray-300 rounded px-3 py-2"
                  min="0"
                  max="100"
                  placeholder="0"
                />
                {descuento > 0 && productoSeleccionado && (
                  <div className="text-sm text-gray-600 mt-2">
                    Precio original: {nuevaFila.precio.toFixed(2)}€
                    <br />
                    Precio con descuento: {nuevaFila.precio_unitario.toFixed(2)}€
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setFase("confirmacion");
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Continuar
              </button>
              <button
                onClick={() => {
                  setDescuento(0);
                  setMostrarDescuento(false);
                  if (productoSeleccionado) {
                    const precioStr = productoSeleccionado.precio_servicio.replace(/[€,]/g, "").trim();
                    const precio = parseFloat(precioStr) || 0;
                    setNuevaFila({
                      ...nuevaFila,
                      descuento_unitario: 0,
                      precio_unitario: precio
                    });
                  }
                  setFase("confirmacion");
                }}
                className="w-full px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
              >
                Saltar descuento
              </button>
            </div>
          </div>
        );

      case "confirmacion":
        return (
          <div className="space-y-4 p-5">
            <h3 className="text-md font-semibold mb-4">Revisa y confirma los datos</h3>
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1">Medio</label>
                <input
                  type="text"
                  value={nuevaFila.medio}
                  onChange={(e) => setNuevaFila({ ...nuevaFila, medio: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1">Publicación</label>
                <input
                  type="text"
                  value={nuevaFila.publicacion}
                  onChange={(e) => setNuevaFila({ ...nuevaFila, publicacion: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1">Producto</label>
                <input
                  type="text"
                  value={nuevaFila.producto}
                  onChange={(e) => setNuevaFila({ ...nuevaFila, producto: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1">Precio tarifa</label>
                <input
                  type="number"
                  value={nuevaFila.precio}
                  onChange={(e) => {
                    const precio = parseFloat(e.target.value) || 0;
                    const precioConDescuento = precio * (1 - descuento / 100);
                    setNuevaFila({
                      ...nuevaFila,
                      precio: precio,
                      precio_unitario: precioConDescuento
                    });
                  }}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              {mostrarDescuento && (
                <div className="flex flex-col">
                  <label className="text-sm font-semibold mb-1">Descuento unitario (%)</label>
                  <input
                    type="number"
                    value={descuento}
                    onChange={(e) => {
                      const desc = parseFloat(e.target.value) || 0;
                      handleDescuentoChange(desc);
                    }}
                    className="border border-gray-300 rounded px-3 py-2"
                    min="0"
                    max="100"
                  />
                </div>
              )}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1">Precio unitario</label>
                <input
                  type="number"
                  value={nuevaFila.precio_unitario.toFixed(2)}
                  onChange={(e) => {
                    const precio = parseFloat(e.target.value) || 0;
                    setNuevaFila({ ...nuevaFila, precio_unitario: precio });
                  }}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setFase("descuento")}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors cursor-pointer"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmar}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors cursor-pointer"
                disabled={!nuevaFila.medio || !nuevaFila.publicacion || !nuevaFila.producto}
              >
                Confirmar y añadir
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 "
      onClick={handleBackdropClick}
    >
      <div className="bg-white p-6 px-10 rounded-lg shadow-xl w-full max-h-[120vh] max-w-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Agregar nueva fila</h2>
          <button
            onClick={onClose}
            className="text-gray-600  text-4xl hover:text-gray-800 cursor-pointer transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {renderFase()}

        {fase !== "confirmacion" && (
          <div className="mt-4 flex justify-end ">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnadirContenido;
