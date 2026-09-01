import React, { FC, useEffect } from "react";
import CardComentario from "./cards/CardComentario";
import { ComentarioService } from "@/app/service/ComentarioService";

export interface Comentario {
  id_comentario: string;
  autor: string;
  fecha: string;
  contenido: string;
}

interface ContenidoComentariosProps {
  id_cuenta: string;
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

const ContenidoComentarios: FC<ContenidoComentariosProps> = ({
  comentarios,
  setComentarios,
  nuevoComentario,
  setNuevoComentario,
  setMostrarInput,
  modal,
  setModal,
  id_cuenta,
}) => {
  const cerrarModal = () => setModal({ tipo: null });

  const mapComentario = (comentario: any): Comentario => ({
    id_comentario: comentario.id_comentario,
    autor: comentario.id_last_editor || comentario.id_original_autor || "sistema",
    fecha: comentario.created_at
      ? new Date(comentario.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
      : new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }),
    contenido: comentario.contenido_comentario || "",
  });

  useEffect(() => {
    ComentarioService.getComentarios("cuenta", id_cuenta)
      .then((data) => setComentarios(Array.isArray(data) ? data.map(mapComentario) : []))
      .catch((error) => {
        console.error("Error fetching comentarios de cuenta:", error);
        setComentarios([]);
      });
  }, [id_cuenta, setComentarios]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarModal();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const agregarComentario = async () => {
    if (nuevoComentario.trim() === "") return;

    const comentario = await ComentarioService.createComentario({
      tipo_entidad: "cuenta",
      id_entidad: id_cuenta,
      contenido_comentario: nuevoComentario.trim(),
    });
    setComentarios([mapComentario(comentario), ...comentarios]);
    setNuevoComentario("");
    setMostrarInput(false);
  };

  const modificarComentario = async (idComentario: string, contenido: string) => {
    const comentarioActualizado = await ComentarioService.updateComentario(idComentario, { contenido_comentario: contenido });
    setComentarios((prev) =>
      prev.map((comentario) =>
        comentario.id_comentario === idComentario
          ? mapComentario(comentarioActualizado)
          : comentario,
      ),
    );
  };

  const borrarComentario = async () => {
    if (!modal.comentario) return;
    await ComentarioService.deleteComentario(modal.comentario.id_comentario);
    setComentarios((prev) =>
      prev.filter((comentario) => comentario.id_comentario !== modal.comentario?.id_comentario),
    );
    cerrarModal();
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 w-full">
        <textarea
          value={nuevoComentario}
          onChange={(e) => {
            setNuevoComentario(e.target.value);
            setMostrarInput(true);
          }}
          placeholder="Escribe un nuevo comentario..."
          className="border border-gray-300 rounded-lg p-3 resize-y w-full min-h-28 focus:outline-none focus:ring focus:ring-blue-400"
        />
        <div className="flex flex-row justify-end gap-2">
          <button
            onClick={agregarComentario}
            className="bg-blue-950 text-gray-100 px-4 py-2 rounded-lg shadow-xl cursor-pointer hover:bg-blue-950/90 text-sm"
          >
            Añadir comentario
          </button>
        </div>
      </div>

      <div className="flex flex-col py-5 gap-3">
        {comentarios.map((comentario) => (
          <CardComentario
            key={comentario.id_comentario}
            autor={comentario.autor}
            fecha={comentario.fecha}
            contenido={comentario.contenido}
            onModificar={(contenido) => modificarComentario(comentario.id_comentario, contenido)}
            onBorrar={() => setModal({ tipo: "borrar", comentario })}
          />
        ))}
      </div>

      {modal.tipo === "borrar" && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-96 p-6 relative">
            <button
              onClick={cerrarModal}
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-xl"
            >
              x
            </button>

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
                  onClick={borrarComentario}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                >
                  Sí, borrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContenidoComentarios;
