"use client";

import React, { FC, useState } from "react";
import PopUp from "../PopUp";
import {TimeLogService} from "@/app/service/TimeLogService";
import MiddleNav from "../../../general_components/componentes_recurrentes/MiddleNav";

interface RegistroProps { }

const Registro: FC<RegistroProps> = () => {
  const [employeeId] = useState("");
  const [event, setEvent] = useState("entrada");
  const [comments, setComments] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const handleReset = () => {
    window.location.reload();
  };

  const handleConfirm = async () => {
      try {
          await TimeLogService.createTimeLog(event, comments);
          alert("Evento registrado correctamente");
      } catch (e: any){
          alert(e?.message || e || 'Error al registrar el evento');
      } finally {
          setShowPopup(false);
      }
  };


  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
          <MiddleNav tituloprincipal={'Registro de Evento de Fichaje'} />           

      <div className="flex flex-col w-3xl h-3xl mx-auto my-36 p-6 bg-white shadow-xl rounded-2xl space-y-12 text-gray-700">
        <div className="space-y-2">
          <label className="block font-bold text-2xl font-medium text-gray-700">Introduzca evento de fichaje</label>
          <select 
            value={event} onChange={(e) => setEvent(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option className="bg-gray-100 cursor-pointer" value="entrada">Fichar entrada</option>
            <option className="bg-gray-100 cursor-pointer" value="descanso">Fichar pausa</option>
            <option className="bg-gray-100 cursor-pointer" value="salida">Fichar salida</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block font-bold text-2xl font-medium text-gray-700">Comentarios</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Introduzca comentarios sobre el registro si es necesario."
            className="w-full px-4 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 text-lg">
          <button
            onClick={handleReset}
            className="w-full bg-blue-950 text-white py-2 px-4 rounded-xl shadow hover:bg-blue-900 transition duration-200"
          >
            Cancelar y borrar
          </button>
          <button
            onClick={() => setShowPopup(true)}
            className="w-full bg-blue-950 text-white  py-2 px-4 rounded-xl shadow hover:bg-blue-900 transition duration-200"
          >
            Registrar evento
          </button>
        </div>

        {showPopup && (
          <PopUp
            data={{ employeeId, event, comments }}
            onClose={() => setShowPopup(false)}
            onCancel={() => setShowPopup(false)}
            onConfirm={handleConfirm}
          />
        )}
      </div>
    </div>
  );
};

export default Registro;