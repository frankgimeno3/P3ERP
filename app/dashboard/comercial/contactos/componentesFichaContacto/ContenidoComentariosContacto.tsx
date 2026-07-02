import React, { FC } from "react";
import CardComentarioContacto from "./CardComentarioContacto";
import { InterfazContacto } from "@/app/interfaces/interfaces";

export interface Comentario {
  id_comentario: string;
  autor: string;
  fecha: string;
  contenido: string;
}

interface ContenidoComentariosContactoProps {
  contacto: InterfazContacto;
  comentarios: Comentario[];
  setComentarios: React.Dispatch<React.SetStateAction<Comentario[]>>;
  nuevoComentario: string;
  setNuevoComentario: React.Dispatch<React.SetStateAction<string>>;
  mostrarInput: boolean;
  setMostrarInput: React.Dispatch<React.SetStateAction<boolean>>;
  modal: {
    tipo: "editar" | "borrar" | null;
    comentario?: Comentario;
  };
  setModal: React.Dispatch<React.SetStateAction<{
    tipo: "editar" | "borrar" | null;
    comentario?: Comentario;
  }>>;
}

const ContenidoComentariosContacto: FC<ContenidoComentariosContactoProps> = ({
  contacto,
  comentarios,
  setComentarios,
  nuevoComentario,
  setNuevoComentario,
  mostrarInput,
  setMostrarInput,
  modal,
  setModal,
}) => {

  const agregarComentario = () => {
    if (nuevoComentario.trim() === "") return;

    const hoy = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const comentario: Comentario = {
      id_comentario: `temp_${Date.now()}`,
      autor: "Usuario Actual",
      fecha: hoy,
      contenido: nuevoComentario,
    };

    setComentarios([comentario, ...comentarios]);
    setNuevoComentario("");
    setMostrarInput(false);
  };

  const cerrarModal = () => setModal({ tipo: null });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">
        Comentarios sobre {contacto.nombre_completo_contacto}
      </h3>
      <p className="mb-4 text-gray-600">
        Aviso: Los comentarios agregados aquí se agregarán automáticamente
        también en la ficha de la empresa
      </p>

      <div className="text-right w-full mb-4">
        <button
          className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-950/90"
          onClick={() => setMostrarInput(!mostrarInput)}
        >
          {mostrarInput ? "Cancelar" : "Añadir comentario"}
        </button>
      </div>

      {mostrarInput && (
        <div className="flex flex-col gap-2 mb-6">
          <textarea
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            placeholder="Escribe un nuevo comentario..."
            className="border border-gray-300 rounded-lg p-3 resize-none w-full"
          />
          <button
            onClick={agregarComentario}
            className="bg-blue-600 text-white rounded-lg px-5 py-2 hover:bg-blue-700 self-end"
          >
            Guardar comentario
          </button>
        </div>
      )}

      {comentarios.map((comentario) => (
        <CardComentarioContacto
          key={comentario.id_comentario}
          autor={comentario.autor}
          fecha={comentario.fecha}
          contenido={comentario.contenido}
          onEditar={() => setModal({ tipo: "editar", comentario })}
          onBorrar={() => setModal({ tipo: "borrar", comentario })}
        />
      ))}

      {modal.tipo && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-96 p-6 relative">
            <button
              onClick={cerrarModal}
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>

            {modal.tipo === "editar" && (
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-gray-800">
                  Editar comentario
                </h2>
                <textarea
                  defaultValue={modal.comentario?.contenido}
                  className="border border-gray-300 rounded-lg p-3 resize-none"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={cerrarModal}
                    className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implementar edición
                      cerrarModal();
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  >
                    Modificar
                  </button>
                </div>
              </div>
            )}

            {modal.tipo === "borrar" && (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  ¿Seguro que quieres borrar el comentario?
                </h2>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={cerrarModal}
                    className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 cursor-pointer"
                  >
                    No, cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (modal.comentario) {
                        setComentarios(comentarios.filter(c => c.id_comentario !== modal.comentario?.id_comentario));
                        cerrarModal();
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                  >
                    Sí, borrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContenidoComentariosContacto;
