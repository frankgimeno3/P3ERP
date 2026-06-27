"use client";
import React, { FC, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ContenidoGeneralContacto from "../componentesFichaContacto/ContenidoGeneralContacto";
import ContenidoComentariosContacto from "../componentesFichaContacto/ContenidoComentariosContacto";
import BotonFlotante from "@/app/general_components/componentes_recurrentes/BotonFlotante";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import contactsContents from '@/app/contents/contactsContents.json';
import comentariosContactos from '@/app/contents/comentariosContactosContents.json';
import agentes from '@/app/contents/agentesContents.json';
import { InterfazContacto } from '@/app/interfaces/interfaces';

interface Comentario {
  id_comentario: string;
  autor: string;
  fecha: string;
  contenido: string;
}

const FichaContacto: FC = () => {
  const params = useParams();

  const contactoId: string | null = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id ?? null;

  const [isContenidoEdited, setIsContenidoEdited] = useState(false);
  
  // Estado de contacto editable
  const [contactoEditable, setContactoEditable] = useState<InterfazContacto | undefined>(
    () => contactsContents.find((c) => c.id_contacto === contactoId)
  );

  // Estados de comentarios
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [mostrarInput, setMostrarInput] = useState(false);
  const [modal, setModal] = useState<{
    tipo: "editar" | "borrar" | null;
    comentario?: Comentario;
  }>({ tipo: null });

  // Estados de OtrosDatosContacto
  const [suscripciones, setSuscripciones] = useState<string[]>([]);
  const [otrosDatos, setOtrosDatos] = useState<string>("");
  const [idiomas, setIdiomas] = useState<string>("");
  const [pais, setPais] = useState<string>("");
  const [conocidoEn, setConocidoEn] = useState<string>("");
  const [contactadoEnFeria, setContactadoEnFeria] = useState<string>("");

  useEffect(() => {
    const contacto = contactsContents.find((c) => c.id_contacto === contactoId);
    setContactoEditable(contacto);
    if (contacto) {
      setSuscripciones(contacto.suscripciones || []);
      setOtrosDatos(contacto.otros_datos_interes || "");
      setIdiomas(contacto.idiomas);
      setPais(contacto.pais_contacto);
      setConocidoEn(contacto.conocido_en || "");
      setContactadoEnFeria(contacto.contactado_en_feria);
    }
  }, [contactoId]);

  // Cargar comentarios desde JSON
  useEffect(() => {
    const contactoComentarios = comentariosContactos.contactosConComentarios.find(
      (c) => c.id_contacto === contactoId
    );
    if (!contactoComentarios) {
      setComentarios([]);
      return;
    }

    const comentariosFormateados = contactoComentarios.array_comentarios_contacto.map((c) => {
      const agente = agentes.find((a) => a.id_agente === c.id_autor);
      const nombreAutor = agente ? agente.nombre_agente : c.id_autor;

      return {
        id_comentario: c.id_comentario,
        autor: nombreAutor,
        fecha: new Date(c.fecha_comentario).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        contenido: c.contenido_comentario,
      };
    });

    setComentarios(comentariosFormateados);
  }, [contactoId]);

  const [pestana, setPestana] = useState<'general' | 'comentarios'>('general');

  if (!contactoEditable) {
    return (
      <div className="bg-gray-100 min-h-screen p-12 text-gray-600">
        <h2 className="text-lg font-semibold">Contacto no encontrado {contactoId}</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal={`Ficha del contacto ${contactoEditable.nombre_completo_contacto}`} />
      <div className="bg-gray-100 min-h-screen p-12 text-gray-600 relative">

        <div className="flex flex-row mt-3 relative">
          {[
            { key: 'general', label: 'Datos Generales' },
            { key: 'comentarios', label: 'Comentarios' },
          ].map(({ key, label }, index) => (
            <div
              key={key}
              className={`p-3 rounded-tr-lg cursor-pointer w-60 text-center transition-all duration-300
              ${pestana === key
                  ? 'bg-white z-30 rounded-tl-lg'
                  : 'bg-blue-950 text-white z-10 hover:bg-blue-950/80'
                }`}
              style={{ marginLeft: index === 0 ? '0px' : '-5px' }}
              onClick={() => setPestana(key as typeof pestana)}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="bg-white p-12 shadow-xl rounded-b-lg">
          {pestana === 'general' && (
            <ContenidoGeneralContacto 
              contacto={contactoEditable}
              setContactoEditable={setContactoEditable}
              setIsContenidoEdited={setIsContenidoEdited}
              suscripciones={suscripciones}
              setSuscripciones={setSuscripciones}
              otrosDatos={otrosDatos}
              setOtrosDatos={setOtrosDatos}
              idiomas={idiomas}
              setIdiomas={setIdiomas}
              pais={pais}
              setPais={setPais}
              conocidoEn={conocidoEn}
              setConocidoEn={setConocidoEn}
              contactadoEnFeria={contactadoEnFeria}
              setContactadoEnFeria={setContactadoEnFeria}
            />
          )}

          {pestana === 'comentarios' && (
            <ContenidoComentariosContacto
              contacto={contactoEditable}
              comentarios={comentarios}
              setComentarios={setComentarios}
              nuevoComentario={nuevoComentario}
              setNuevoComentario={setNuevoComentario}
              mostrarInput={mostrarInput}
              setMostrarInput={setMostrarInput}
              modal={modal}
              setModal={setModal}
            />
          )}
        </div>

        <BotonFlotante isContenidoEdited={isContenidoEdited} />
      </div>
    </div>
  );
};

export default FichaContacto;
