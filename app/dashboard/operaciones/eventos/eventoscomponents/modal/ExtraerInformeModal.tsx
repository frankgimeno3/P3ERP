import React, { FC, useEffect, useState } from 'react';
import Modalf1 from './fases/modalf1';
import Modalf2 from './fases/modalf2';

interface ExtraerInformeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface Configuracion {
  agente: string;
  tipoEvento: string;
  mesInicio: string;
  anoInicio: string;
  mesFinal: string;
  anoFinal: string;
}

const ExtraerInformeModal: FC<ExtraerInformeModalProps> = ({ isOpen, onClose }) => {

    const [modalFase, setModalFase] = useState(1);
    const [configuracion, setConfiguracion] = useState<Configuracion>({
        agente: "Todos",
        tipoEvento: "Todos",
        mesInicio: "1",
        anoInicio: "2025",
        mesFinal: "1",
        anoFinal: "2025"
    });

    useEffect(() => {
      setModalFase(1);
      const handleEsc = (event: KeyboardEvent) => {
        if (event.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl w-11/12 md:w-2/3 lg:w-1/2 p-12 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 font-bold text-xl cursor-pointer"
          >
            &times;
          </button>
          <div>
            {modalFase === 1 ? (
              <Modalf1
                setModalFase={setModalFase}
                onClose={onClose}
                configuracion={configuracion}
                setConfiguracion={setConfiguracion}
              />
            ) : (
              <Modalf2
                setModalFase={setModalFase}
                configuracion={configuracion}
              />
            )}
          </div>
        </div>
      </div>
    );
};

export default ExtraerInformeModal;
