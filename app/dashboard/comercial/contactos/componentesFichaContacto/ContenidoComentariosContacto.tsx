import React, { FC, useEffect, useState } from "react";
import CardComentarioContacto from "./CardComentarioContacto";
import { InterfazContacto } from "@/app/interfaces/interfaces";
import { ComentarioService } from "@/app/service/ComentarioService";

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
  const [editingText, setEditingText] = useState("");

  const mapComentario = (comentario: any): Comentario => ({
    id_comentario: comentario.id_comentario,
    autor: comentario.id_last_editor || comentario.id_original_autor || "sistema",
    fecha: comentario.created_at
      ? new Date(comentario.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
      : new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }),
    contenido: comentario.contenido_comentario || "",
  });

  useEffect(() => {
    ComentarioService.getComentarios("contacto", contacto.id_contacto)
      .then((data) => setComentarios(Array.isArray(data) ? data.map(mapComentario) : []))
      .catch((error) => {
        console.error("Error fetching comentarios de contacto:", error);
        setComentarios([]);
      });
  }, [contacto.id_contacto, setComentarios]);

  const agregarComentario = async () => {
    if (nuevoComentario.trim() === "") return;
    const comentario = await ComentarioService.createComentario({
      tipo_entidad: "contacto",
      id_entidad: contacto.id_contacto,
      contenido_comentario: nuevoComentario.trim(),
    });
    setComentarios([mapComentario(comentario), ...comentarios]);
    setNuevoComentario("");
    setMostrarInput(false);
  };

  const cerrarModal = () => setModal({ tipo: null });

  const modificarComentario = async () => {
    if (!modal.comentario) return;
    const comentarioActualizado = await ComentarioService.updateComentario(modal.comentario.id_comentario, {
      contenido_comentario: editingText,
    });
    setComentarios((current) => current.map((comentario) => (
      comentario.id_comentario === modal.comentario?.id_comentario ? mapComentario(comentarioActualizado) : comentario
    )));
    cerrarModal();
  };

  const borrarComentario = async () => {
    if (!modal.comentario) return;
    await ComentarioService.deleteComentario(modal.comentario.id_comentario);
    setComentarios((current) => current.filter((comentario) => comentario.id_comentario !== modal.comentario?.id_comentario));
    cerrarModal();
  };

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Comentarios sobre {contacto.nombre_completo_contacto}
      </h3>
      <p className="mb-4 text-gray-600">
        Aviso: Los comentarios agregados aquí se registran también como evento de la cuenta si el contacto está asociado a una.
      </p>

      <div className="mb-4 w-full text-right">
        <button
          className="cursor-pointer rounded-lg bg-blue-950 p-2 px-4 text-gray-100 shadow-xl hover:bg-blue-950/90"
          onClick={() => setMostrarInput(!mostrarInput)}
        >
          {mostrarInput ? "Cancelar" : "Añadir comentario"}
        </button>
      </div>

      {mostrarInput && (
        <div className="mb-6 flex flex-col gap-2">
          <textarea
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            placeholder="Escribe un nuevo comentario..."
            className="w-full resize-none rounded-lg border border-gray-300 p-3"
          />
          <button
            onClick={agregarComentario}
            className="self-end rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
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
          onEditar={() => {
            setEditingText(comentario.contenido);
            setModal({ tipo: "editar", comentario });
          }}
          onBorrar={() => setModal({ tipo: "borrar", comentario })}
        />
      ))}

      {modal.tipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-96 rounded-xl bg-white p-6 shadow-2xl">
            <button onClick={cerrarModal} className="absolute right-3 top-2 text-xl text-gray-500 hover:text-gray-800">
              x
            </button>

            {modal.tipo === "editar" && (
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-gray-800">Editar comentario</h2>
                <textarea
                  value={editingText}
                  onChange={(event) => setEditingText(event.target.value)}
                  className="resize-none rounded-lg border border-gray-300 p-3"
                />
                <div className="flex justify-end gap-3">
                  <button onClick={cerrarModal} className="cursor-pointer rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300">
                    Cancelar
                  </button>
                  <button onClick={modificarComentario} className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    Modificar
                  </button>
                </div>
              </div>
            )}

            {modal.tipo === "borrar" && (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-gray-800">¿Seguro que quieres borrar el comentario?</h2>
                <div className="flex justify-end gap-3">
                  <button onClick={cerrarModal} className="cursor-pointer rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300">
                    No, cancelar
                  </button>
                  <button onClick={borrarComentario} className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
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
