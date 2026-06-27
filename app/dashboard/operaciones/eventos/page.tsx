"use client";
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import React, { FC, useEffect, useState } from 'react';
import { ModificationService } from '@/app/service/ModificationService';
import FiltroTemporal from './eventoscomponents/FiltroTemporal';
import EventoHistorial from '@/app/contents/EventosRegistradosContents.json';
import ExtraerInformeModal from './eventoscomponents/modal/ExtraerInformeModal';

interface EventosProps {}

interface Evento {
  id_evento: string;
  fecha_evento: string;  
  autor_evento: string;
  tipo_evento: string;
  descripcion_evento: string;
}


const Eventos: FC<EventosProps> = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [showModal, setShowModal] = useState(false);  
  const [timeLogs, setTimeLogs] = useState<Evento[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string;
    createdBy: string;
    type: string;
    createdAt: string;
    comment: string;
    modifications: any;
  } | null>(null);

  const handleEdit = (eventData: typeof selectedEvent) => {
    setSelectedEvent(eventData);
    setShowPopup(true);
  };

  const handleConfirm = async (newType: string, newDate: string, comment: string) => {
    try {
      if (!selectedEvent) return;
      await ModificationService.createModification(selectedEvent.id, newType, newDate, comment);
      alert("Evento registrado correctamente");
    } catch (e: any) {
      alert(e.message);
    }
    setShowPopup(false);
  };

  useEffect(() => {
    setTimeLogs(EventoHistorial as Evento[]);
  }, []);

  const handleFilter = (mesStr: string, anioStr: string, agente: string, tipoEvento: string) => {
    const month = parseInt(mesStr, 10);
    const year = parseInt(anioStr, 10);

    const filtered = (EventoHistorial as Evento[]).filter(evento => {
      const [day, evtMonth, evtYear] = evento.fecha_evento.split('/').map(Number);
      const monthMatch = evtMonth === month;
      const yearMatch = evtYear === year;
      const agenteMatch = agente === "Todos" || evento.autor_evento === agente;
      const tipoMatch = tipoEvento === "Todos" || evento.tipo_evento === tipoEvento;
      return monthMatch && yearMatch && agenteMatch && tipoMatch;
    });

    setTimeLogs(filtered);
  };

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal={'Listado completo de eventos registrados'} />

      <div className='w-full justify-end text-end p-7'>
        <button
          className='bg-blue-950 hover:bg-blue-950/80 cursor-pointer text-white rounded-lg shadow-xl p-2 px-4'
          onClick={() => setShowModal(true)}  
        >
          Extraer informe
        </button>
      </div>

      <div className='p-7 text-gray-700 gap-12'>
        <FiltroTemporal onFiltrar={handleFilter} />

        {timeLogs.length !== 0 ? 
          <div className='bg-white p-12'>
            {timeLogs.map((evento) => (
              <div
                key={evento.id_evento}
                className="border-b border-gray-200 p-3 cursor-pointer hover:bg-gray-100"
                onClick={() => handleEdit({
                  id: evento.id_evento,
                  createdBy: evento.autor_evento,
                  type: evento.tipo_evento,
                  createdAt: evento.fecha_evento,
                  comment: evento.descripcion_evento,
                  modifications: null
                })}
              >
                <p><strong>Tipo:</strong> {evento.tipo_evento}</p>
                <p><strong>Fecha:</strong> {evento.fecha_evento}</p>
                <p><strong>Autor:</strong> {evento.autor_evento}</p>
                <p><strong>Descripción:</strong> {evento.descripcion_evento}</p>
              </div>
            ))}
          </div>
        :
          <div className='bg-white p-12 border-y border-gray-200 p-3 px-5 text-gray-600 shadow'>
            <p>No se han encontrado resultados de eventos con los criterios seleccionados</p>
          </div>
        }
      </div>

       <ExtraerInformeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};

export default Eventos;
