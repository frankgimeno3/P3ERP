'use client'
import React, {FC, use, useState} from 'react';
import {TimeLogService} from "@/app/service/TimeLogService";
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

interface InformesProps {}

interface Modifications {
    id: string,
    createdBy: string,
    newType: string,
    comment: string,
    status: string,
    createdAt: string
}

interface TimeLog {
    id: string,
    createdBy: string,
    type: string,
    comment: string,
    ip: string,
    modifications: Modifications[],
    createdAt: string
}

const Informes: FC<InformesProps> = ({}) => {
    const [empleados, setEmpleados] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [resultados, setResultados] = useState<TimeLog[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    function formatDateToMMDDYYYY(date: Date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day   = String(date.getDate()).padStart(2, '0');
        const year  = date.getFullYear();

        return `${month}/${day}/${year}`;
    }

    function formatTimeToHHMM(date: Date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${hours}:${minutes}`;
    }

    const handleFiltrar = async () => {
        if(!fechaDesde || !fechaHasta) return;
        console.log('Filtrando informes...');
        try {
            const response = await TimeLogService.getUsersTimeLogs(fechaDesde, fechaHasta, empleados);
            setResultados(response);
        } catch (error: any){
            alert(error.message);
            setError(error.message);
        }
    };

    const handleDescargarCSV = async () => {
        if(!fechaDesde || !fechaHasta) return;
        console.log('Descargar CSV');
        try {
            const data = await TimeLogService.getUsersTimeLogsInCsv(fechaDesde, fechaHasta, empleados);
            const csvBlob = new Blob([data], { type: 'text/csv' });
            const blobUrl = window.URL.createObjectURL(csvBlob);

            const now = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `timeLogs_${now}.csv`;

            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(blobUrl);
        } catch (error: any){
            alert(error.message);
            setError(error.message);
        }
    };

    return (
     <div className="flex flex-col h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal={`Gestión de fichajes`} />
            <div className="p-6 px-12 bg-gray-100 min-h-screen">
                <div className="flex flex-col space-y-4 mb-6">
                    <div className="flex flex-col space-y-4 bg-white shadow p-4  rounded">
                        <p className="text-lg text-gray-600">Configurar Filtros</p>
                        <div className="flex flex-col space-y-2">
                            <div>
                                <label htmlFor="empleados" className="text-sm">Empleados (números separados por comas)</label>
                                <input
                                    id="empleados"
                                    type="text"
                                    value={empleados}
                                    onChange={(e) => setEmpleados(e.target.value)}
                                    placeholder="Ejemplo: lena.wooden12@email.com, mike.stone88@mailhub.net, toby.green04@inbox.org"
                                    className="p-2 w-full border placeholder-gray-400 border-gray-300 rounded"
                                />
                            </div>
                            <div className="flex space-x-2">
                                <div className='flex flex-col'>
                                    <label htmlFor="fechaDesde" className="text-sm">Desde</label>
                                    <input
                                        id="fechaDesde"
                                        type="date"
                                        value={fechaDesde}
                                        onChange={(e) => setFechaDesde(e.target.value)}
                                        placeholder="DD/MM/AA"
                                        className="p-2  border border-gray-300 rounded"
                                    />
                                </div>
                                <div className='flex flex-col'>
                                    <label htmlFor="fechaHasta" className="text-sm">Hasta</label>
                                    <input
                                        id="fechaHasta"
                                        type="date"
                                        value={fechaHasta}
                                        onChange={(e) => setFechaHasta(e.target.value)}
                                        placeholder="DD/MM/AA"
                                        className="p-2  border border-gray-300 rounded"
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleFiltrar}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-36"
                        >
                            Filtrar Informes
                        </button>
                    </div>

                     <div className="flex flex-col bg-white shadow ">
                         <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <p className="text-lg font-semibold">Resultados</p>
                            <button
                                onClick={handleDescargarCSV}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                                Descargar como CSV
                            </button>
                        </div>

                         <div className="bg-white p-4 shadow-md">
                            {resultados.length === 0 ? (
                                <p className="text-center text-gray-500">Introduzca valores para empezar</p>
                            ) : (
                                <table className="min-w-full text-left">
                                    <thead className="bg-gray-200">
                                        <tr>
                                            <th className="p-2">Autor</th>
                                            <th className="p-2">Evento</th>
                                            <th className="p-2">Día</th>
                                            <th className="p-2">Hora</th>
                                            <th className="p-2">Comentarios</th>
                                            <th className="p-2">IP</th>
                                            <th className="p-2">Editar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resultados.map((evento, index) => (
                                            <tr key={index} className="border-t">
                                                <td className="p-2">{evento.createdBy}</td>
                                                <td className="p-2">{evento.type}</td>
                                                <td className="p-2">{formatDateToMMDDYYYY(new Date(evento.createdAt))}</td>
                                                <td className="p-2">{formatTimeToHHMM(new Date(evento.createdAt))}</td>
                                                <td className="p-2">{evento.comment}</td>
                                                <td className="p-2">{evento.ip}</td>
                                                <td className="p-2">
                                                    <button className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">
                                                        Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            </div>
    );
};

export default Informes;