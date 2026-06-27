import React, { FC } from 'react';
import agentesContents from "@/app/contents/agentesContents.json";
import { Configuracion } from '../ExtraerInformeModal';

interface Modalf1Props {
    setModalFase: React.Dispatch<React.SetStateAction<number>>;
    onClose: () => void;
    configuracion: Configuracion;
    setConfiguracion: React.Dispatch<React.SetStateAction<Configuracion>>;
}

const Modalf1: FC<Modalf1Props> = ({ setModalFase, onClose, configuracion, setConfiguracion }) => {
    const tiposEvento = [
        "Todos",
        "Modificación en cuenta o contacto",
        "Creación en cuenta o contacto",
        "Edición de propuesta",
        "Creación de propuesta",
        "Creación de contrato",
        "Modificación de contrato",
        "Modificación de materiales",
        "Creación de servicio",
        "Modificación de servicio",
        "Modificación de Orden",
        "Evento de fichaje",
        "Evento de solicitud de fichaje",
        "Evento de aprovación/rechazo fichaje",
        "Creación de usuario",
        "Edición de usuario",
        "Importación",
        "Exportación"
    ];

    const meses = ["1","2","3","4","5","6","7","8","9","10","11","12"];
    const anos = ["2025","2024"];

    return (
        <div>
            <p className='font-bold text-2xl text-blue-950/70 mb-5 text-center'> 
                Introduzca los parámetros por los que desea filtrar los eventos registrados
            </p>

            <p className='text-gray-500 font-bold pt-5'>Selección de fechas:</p>
            <div className='flex flex-row rounded-lg bg-gray-100/40 mt-1'>
                <div className='flex flex-col w-1/2 px-5 py-2 text-sm'>
                    <p className='font-bold text-blue-950/70 mb-2'>Fecha inicial</p>
                    <div className='flex flex-row gap-5'>
                        <p>Mes</p>
                        <select
                            className="text-gray-600 px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-100/40 cursor-pointer"
                            value={configuracion.mesInicio}
                            onChange={(e) => setConfiguracion({...configuracion, mesInicio: e.target.value})}
                        >
                            {meses.map(mes => <option key={mes} value={mes}>{mes}</option>)}
                        </select>
                        <p>Año</p>
                        <select
                            className="text-gray-600 px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-100/40 cursor-pointer"
                            value={configuracion.anoInicio}
                            onChange={(e) => setConfiguracion({...configuracion, anoInicio: e.target.value})}
                        >
                            {anos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                        </select>
                    </div>
                </div>

                <div className='flex flex-col w-1/2 px-5 py-2 text-sm'>
                    <p className='font-bold text-blue-950/70 mb-2'>Fecha final</p>
                    <div className='flex flex-row gap-5'>
                        <p>Mes</p>
                        <select
                            className="text-gray-600 px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-100/40 cursor-pointer"
                            value={configuracion.mesFinal}
                            onChange={(e) => setConfiguracion({...configuracion, mesFinal: e.target.value})}
                        >
                            {meses.map(mes => <option key={mes} value={mes}>{mes}</option>)}
                        </select>
                        <p>Año</p>
                        <select
                            className="text-gray-600 px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-100/40 cursor-pointer"
                            value={configuracion.anoFinal}
                            onChange={(e) => setConfiguracion({...configuracion, anoFinal: e.target.value})}
                        >
                            {anos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex flex-col text-left py-5">
                <p className='text-gray-500 font-bold'>Selección de agente:</p>
                <select
                    className="text-gray-600 px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-100/40 cursor-pointer"
                    value={configuracion.agente}
                    onChange={(e) => setConfiguracion({...configuracion, agente: e.target.value})}
                >
                    {agentesContents.map(ag => <option key={ag.id_agente} value={ag.id_agente}>{ag.nombre_completo_agente}</option>)}
                </select>
            </div>

            <div className="flex flex-col text-left py-5">
                <p className='text-gray-500 font-bold'>Tipo de evento:</p>
                <select
                    className="text-gray-600 px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-100/40 cursor-pointer"
                    value={configuracion.tipoEvento}
                    onChange={(e) => setConfiguracion({...configuracion, tipoEvento: e.target.value})}
                >
                    {tiposEvento.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
            </div>

            <div className='flex flex-row gap-8 mt-5'>
                <button
                    className="px-3 py-1 rounded-lg shadow bg-blue-950 hover:bg-blue-950/90 text-white cursor-pointer"
                    onClick={() => setModalFase(2)}
                >
                    Continuar
                </button>
                <button
                    className="px-3 py-1 rounded-lg shadow bg-blue-950 hover:bg-blue-950/90 text-white cursor-pointer"
                    onClick={onClose}
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default Modalf1;
