"use client";

import React, { FC, use, useEffect, useState } from 'react';
import EventoHistorial from './EventoHistorial';
import PopUpHistorial from './PopUpHistorial';
import FiltroTemporal from './FiltroTemporal';
import { TimeLogService } from "@/app/service/TimeLogService";
import { ModificationService } from "@/app/service/ModificationService";
import MiddleNav from '../../../general_components/componentes_recurrentes/MiddleNav';

const Historial: FC = () => {
    const [showPopup, setShowPopup] = useState(false);
    const [timeLogs, setTimeLogs] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState<{
        id: string;
        createdBy: string;
        type: string;
        createdAt: Date,
        comment: string;
        modifications: any
    } | null>(null);


    const handleEdit = (eventData: typeof selectedEvent) => {
        setSelectedEvent(eventData);
        setShowPopup(true);
    };

    const handleConfirm = async (newType: string, newDate: string, comment: string) => {
        try {
            const modification = await ModificationService.createModification(selectedEvent?.id, newType, newDate, comment);
            alert("Evento registrado correctamente");
        } catch (e: any) {
            alert(e.message)
        }
        setShowPopup(false);
    };


    useEffect(() => {
        try {
            const now = new Date();
            handleFilter(
                String(now.getMonth() + 1),
                String(now.getFullYear())
            );
        } catch (error: any) {
            alert(error?.message || error || 'Error desconocido')
        }
    }, [])

    async function getTimeLogs(afterTime: any, beforeTime: any) {
        try {
            const timeLogs = await TimeLogService.getUserTimeLogs(afterTime, beforeTime);
            setTimeLogs(timeLogs);
            console.log("timelogs", timeLogs)
        } catch (error: any) {
            alert(error?.message || error || 'Error al obtener los registros de fichaje')
        }
    }

    function handleFilter(monthStr: string, yearStr: string) {
        const month = parseInt(monthStr, 10) - 1;
        const year = parseInt(yearStr, 10);

        const afterTime = new Date(year, month, 1, 0, 0, 0).toISOString();
        const beforeTime = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        getTimeLogs(afterTime, beforeTime);
        console.log("timelogs", timeLogs)
    }

    return (
        <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">

            <MiddleNav tituloprincipal={'Eventos de registro del usuario x'} />

            <div className='p-7 text-gray-700 gap-12 '>
                     
                    <FiltroTemporal onFiltrar={handleFilter} />
                {timeLogs.length != 0 ? 
                <div className='bg-white p-12'>
                    {timeLogs.map((evento, index) => (
                        <EventoHistorial key={index} data={evento} onEdit={handleEdit} />
                    ))}  
                </div> :
                    <div className='bg-white p-12 border-y border-gray-200 p-3 px-5  text-gray-600 shadow'>
                             <p>No se han encontrado resultados de fichaje para el periodo seleccionado </p>
                             <p>Puedes realizar nuevos eventos de fichaje, o usar el filtro para buscar en otro rango temporal</p>
                     </div>
                }
            </div>

            {showPopup && selectedEvent && (
                <PopUpHistorial
                    data={selectedEvent}
                    onClose={() => setShowPopup(false)}
                    onCancel={() => setShowPopup(false)}
                    onConfirm={handleConfirm}
                />
            )}
        </div>
    );
};

export default Historial;