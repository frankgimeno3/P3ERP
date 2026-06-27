import React, { FC, useEffect, useState } from "react";

interface PopUpHistorialHistorialProps {
  data: {
      createdBy: string;
      type: string;
      createdAt: Date,
      comment: string;
      modifications: any
  };
  onClose: () => void;
  onConfirm: (newType: string, newDate: string, comment: string) => void;
  onCancel: () => void;
}

const PopUpHistorialHistorial: FC<PopUpHistorialHistorialProps> = ({
  data,
  onClose,
  onConfirm,
  onCancel
}) => {
  const [ipAddress, setIpAddress] = useState<string>("");
  const [date, setDate] = useState(new Date(data.createdAt).toISOString().slice(0, 16));
  const [formState, setFormState] = useState({
    employeeId: data.createdBy,
    event: data.type,
    comments: data.comment || ""
  });

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress("No disponible"));
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 text-gray-600" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      <div className="bg-white p-6 rounded-xl w-96 relative shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-2xl font-bold text-gray-600"
        >
          ×
        </button>
        <h3 className="text-lg font-semibold mb-4 text-center">
          Modifique los valores que desea cambiar
        </h3>
        <div className="space-y-4 text-sm text-gray-700 mb-4">
          <div>
            <p>Ip: {ipAddress}</p>
            <label className="block text-gray-600 font-semibold mb-1">Evento:</label>
            <select
              name="event"
              value={formState.event}
              onChange={handleChange}
              className="w-full px-3 py-1 border rounded-lg"
            >
              <option value='entrada'>Fichar entrada</option>
              <option value='descanso'>Fichar pausa</option>
              <option value='salida'>Fichar salida</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Nueva fecha de registro:</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(event)=>{
                  setDate(event.target.value);
              }}
              className="w-full px-3 py-1 border rounded-lg bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Comentarios:</label>
            <textarea
              name="comments"
              value={formState.comments}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-1 border rounded-lg"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={()=>onConfirm(formState.event, date, formState.comments)}
            className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700"
          >
            Confirmar
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-300 px-4 py-2 rounded-xl hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopUpHistorialHistorial;
