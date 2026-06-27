import React, { FC, useState, useMemo } from "react";
import serviciosData from "@/app/contents/ServiciosContents.json";

interface Servicio {
  id_servicio: string;
  medio_servicio_es: string;
  edicion_servicio_es: string;
  publicacion_servicio_es: string;
  nombre_servicio_es: string;
  precio_servicio: string;
}

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

interface Fase3CrearProps {
  setFaseCreacionPropuesta: (fase: number) => void;
  productos: Producto[];
  setProductos: React.Dispatch<React.SetStateAction<Producto[]>>;
}

type Fase = "medio" | "edicion" | "producto" | "descuento" | "confirmacion";

const Fase3Crear: FC<Fase3CrearProps> = ({ setFaseCreacionPropuesta, productos, setProductos }) => {
  const servicios = serviciosData as Servicio[];
  const [showPopup, setShowPopup] = useState(false);
  const [fase, setFase] = useState<Fase>("medio");
  const [medioSeleccionado, setMedioSeleccionado] = useState<string>("");
  const [edicionSeleccionada, setEdicionSeleccionada] = useState<string>("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Servicio | null>(null);
  const [descuento, setDescuento] = useState<number>(0);
  const [mostrarDescuento, setMostrarDescuento] = useState<boolean>(false);
  const [nuevoProducto, setNuevoProducto] = useState<Producto | null>(null);

  // Obtener medios únicos
  const mediosUnicos = useMemo(() => {
    const medios = new Set(servicios.map(s => s.medio_servicio_es));
    return Array.from(medios).sort();
  }, [servicios]);

  // Obtener ediciones únicas para el medio seleccionado
  const edicionesUnicas = useMemo(() => {
    if (!medioSeleccionado) return [];
    const ediciones = new Set(
      servicios
        .filter(s => s.medio_servicio_es === medioSeleccionado)
        .map(s => s.edicion_servicio_es)
    );
    return Array.from(ediciones).sort();
  }, [medioSeleccionado, servicios]);

  // Obtener productos únicos para el medio y edición seleccionados
  const productosUnicos = useMemo(() => {
    if (!medioSeleccionado || !edicionSeleccionada) return [];
    return servicios.filter(
      s => s.medio_servicio_es === medioSeleccionado && 
           s.edicion_servicio_es === edicionSeleccionada
    );
  }, [medioSeleccionado, edicionSeleccionada, servicios]);

  const resetPopup = () => {
    setFase("medio");
    setMedioSeleccionado("");
    setEdicionSeleccionada("");
    setProductoSeleccionado(null);
    setDescuento(0);
    setMostrarDescuento(false);
    setNuevoProducto(null);
    setShowPopup(false);
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
    
    setNuevoProducto({
      medio: producto.medio_servicio_es,
      publicacion: producto.publicacion_servicio_es,
      producto: producto.nombre_servicio_es,
      precioTarifa: precio,
      precioOfrecido: precio,
      fechaPublicacion: new Date().toLocaleDateString(),
      descuento_unitario: 0,
      precio_unitario: precio
    });
    setFase("descuento");
  };

  const handleDescuentoChange = (valor: number) => {
    setDescuento(valor);
    if (productoSeleccionado && nuevoProducto) {
      const precioConDescuento = nuevoProducto.precioTarifa * (1 - valor / 100);
      
      setNuevoProducto({
        ...nuevoProducto,
        descuento_unitario: valor,
        precio_unitario: precioConDescuento,
        precioOfrecido: precioConDescuento
      });
    }
  };

  const handleConfirmar = () => {
    if (nuevoProducto) {
      setProductos([...productos, nuevoProducto]);
      resetPopup();
    }
  };

  const handleEliminarProducto = (index: number) => {
    const nuevaLista = [...productos];
    nuevaLista.splice(index, 1);
    setProductos(nuevaLista);
  };

  const canConfirmar = productos.length > 0;

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
                {descuento > 0 && nuevoProducto && (
                  <div className="text-sm text-gray-600 mt-2">
                    Precio original: {nuevoProducto.precioTarifa.toFixed(2)}€
                    <br />
                    Precio con descuento: {nuevoProducto.precio_unitario?.toFixed(2)}€
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
                  if (productoSeleccionado && nuevoProducto) {
                    setNuevoProducto({
                      ...nuevoProducto,
                      descuento_unitario: 0,
                      precio_unitario: nuevoProducto.precioTarifa,
                      precioOfrecido: nuevoProducto.precioTarifa
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
                  value={nuevoProducto?.medio || ""}
                  onChange={(e) => nuevoProducto && setNuevoProducto({ ...nuevoProducto, medio: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1">Publicación</label>
                <input
                  type="text"
                  value={nuevoProducto?.publicacion || ""}
                  onChange={(e) => nuevoProducto && setNuevoProducto({ ...nuevoProducto, publicacion: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1">Producto</label>
                <input
                  type="text"
                  value={nuevoProducto?.producto || ""}
                  onChange={(e) => nuevoProducto && setNuevoProducto({ ...nuevoProducto, producto: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1">Precio tarifa</label>
                <input
                  type="number"
                  value={nuevoProducto?.precioTarifa || 0}
                  onChange={(e) => {
                    if (nuevoProducto) {
                      const precio = parseFloat(e.target.value) || 0;
                      const precioConDescuento = precio * (1 - descuento / 100);
                      setNuevoProducto({
                        ...nuevoProducto,
                        precioTarifa: precio,
                        precio_unitario: precioConDescuento,
                        precioOfrecido: precioConDescuento
                      });
                    }
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
                  value={nuevoProducto?.precio_unitario?.toFixed(2) || "0.00"}
                  onChange={(e) => {
                    if (nuevoProducto) {
                      const precio = parseFloat(e.target.value) || 0;
                      setNuevoProducto({ 
                        ...nuevoProducto, 
                        precio_unitario: precio,
                        precioOfrecido: precio
                      });
                    }
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
                disabled={!nuevoProducto?.medio || !nuevoProducto?.publicacion || !nuevoProducto?.producto}
              >
                Confirmar y añadir
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Botón Volver */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setFaseCreacionPropuesta(2)}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400"
        >
          ← Volver a Fase 2
        </button>
      </div>

      {/* Tabla de productos */}
      <div className="overflow-x-auto">
        <table className="w-full border shadow-xs border-gray-100 text-center text-sm">
          <thead>
            <tr className="bg-blue-950/80 text-white">
              <th className="px-4 py-2">Medio</th>
              <th className="px-4 py-2">Publicación</th>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Precio tarifa</th>
              <th className="px-4 py-2">Precio ofrecido</th>
              <th className="px-4 py-2">Fecha publicación</th>
              <th className="px-4 py-2">Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8">
                  <p className="pb-12">Agregue productos para continuar</p>
                  <button
                    onClick={() => {
                      setFase("medio");
                      setShowPopup(true);
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                  >
                    + Agregar productos
                  </button>
                </td>
              </tr>
            ) : (
              <>
                {productos.map((p, index) => (
                  <tr key={index} className="bg-white text-gray-700">
                    <td className="px-4 py-2">{p.medio}</td>
                    <td className="px-4 py-2">{p.publicacion}</td>
                    <td className="px-4 py-2">{p.producto}</td>
                    <td className="px-4 py-2">{p.precioTarifa}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 text-center w-24"
                        placeholder={p.precioTarifa.toString()}
                        value={p.precioOfrecido}
                        onChange={(e) =>
                          setProductos((prev) => {
                            const copia = [...prev];
                            copia[index].precioOfrecido = e.target.value === "" ? "" : Number(e.target.value);
                            return copia;
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-2">{p.fechaPublicacion}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleEliminarProducto(index)}
                        className="text-red-600 font-bold text-xl hover:text-red-800 cursor-pointer"
                        aria-label={`Eliminar producto ${index + 1}`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={7} className="px-4 py-2">
                    <button
                      onClick={() => {
                        setFase("medio");
                        setShowPopup(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                    >
                      + Agregar productos
                    </button>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Botón Confirmar */}
      <div>
        <button
          disabled={!canConfirmar}
          className={`bg-blue-500 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-600 ${
            !canConfirmar ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={() => canConfirmar && setFaseCreacionPropuesta(4)}
        >
          Confirmar y pasar a la configuración del pago
        </button>
      </div>

      {/* Popup para agregar productos */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50" onClick={(e) => e.target === e.currentTarget && resetPopup()}>
          <div className="bg-white p-6 px-10 rounded-lg shadow-xl w-full max-h-[120vh] max-w-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Agregar nuevo producto</h2>
              <button
                onClick={resetPopup}
                className="text-gray-600 text-4xl hover:text-gray-800 cursor-pointer transition-colors"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {renderFase()}

            {fase !== "confirmacion" && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={resetPopup}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Fase3Crear;
