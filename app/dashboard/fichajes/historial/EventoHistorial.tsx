import React, {FC} from 'react';

interface EventoHistorialProps {
    data: {
        id: string;
        createdBy: string;
        type: string;
        createdAt: any,
        comment: string;
        modifications: any
    };
    onEdit: (data: EventoHistorialProps["data"]) => void;
}

const EventoHistorial: FC<EventoHistorialProps> = ({data, onEdit}) => {
    return (
        <div
            className='flex flex-row border-y border-gray-200 p-3 px-5 justify-between items-start bg-white text-gray-600 shadow'>
            <div className='flex flex-col'>
                <div className='flex flex-row'>
                    <p>Día y hora:</p>
                    <div className='pl-5 flex flex-row'>
                        <p className='pl-1'>{new Date(data.createdAt).toLocaleDateString('es-ES')}</p>
                        <p className='pl-1'>{new Date(data.createdAt).toLocaleTimeString('es-ES', { hour12: false })}</p>
                    </div>
                </div>
                <div className='flex flex-row'>
                    <p>Evento:</p>
                    <p className='pl-3'>{data.type}</p>
                </div>
                <div className='flex flex-row'>
                    <p>Comentarios:</p>
                    <p className='pl-3'>{data.comment}</p>
                </div>
                <div className='flex flex-col'>
                    <p className='mr-4'>Modificaciones:</p>
                    <div className='flex flex-col pt-1'>
                        {data.modifications.map((modification: any, index: any)=> {
                            return <div key={index} className='flex flex-col pl-3 border border-gray-200 p-1 px-2'>
                                <div className='flex flex-row'>
                                    <p>Autor de modificacion:</p>
                                    <p className='pl-2'>{modification.createdBy}</p>
                                </div>
                                <div className='flex flex-row'>
                                    <p>Fecha de solicitacion:</p>
                                    <p className='pl-2'>{new Date(modification.createdAt).toLocaleDateString('es-ES')}</p>
                                    <p className='pl-2'>{new Date(modification.createdAt).toLocaleTimeString('es-ES', {hour12: false})}</p>
                                </div>
                                <div className='flex flex-row'>
                                    <p>Nueva fecha:</p>
                                    <p className='pl-2'>{new Date(modification.newDate).toLocaleDateString('es-ES')}</p>
                                    <p className='pl-2'>{new Date(modification.newDate).toLocaleTimeString('es-ES', {hour12: false})}</p>
                                </div>
                                <div className='flex flex-row'>
                                    <p>Cambios realizados:</p>
                                    <p className='pl-2'>Campo evento a cambiado a {modification.newType}</p>
                                </div>
                            </div>
                        })}
                    </div>

                </div>
            </div>
            <button
                className='py-1 px-3 border border-gray-200 rounded hover:bg-gray-200 hover:text-gray-700'
                onClick={() => onEdit(data)}
            >
                Solicitar cambios
            </button>
        </div>
    );
};

export default EventoHistorial;