import React, {FC, useEffect, useState} from "react";

interface PopUpProps {
    data: {
        employeeId: string;
        event: string;
        comments: string;
    };
    onClose: () => void;
    onConfirm: () => void;
    onCancel: () => void;
}

const PopUp: FC<PopUpProps> = ({data, onClose, onConfirm, onCancel}) => {
    const [currentTime, setCurrentTime] = useState<string>("");
    const [ipAddress, setIpAddress] = useState<string>("");

    useEffect(() => {
        const now = new Date().toLocaleTimeString();
        setCurrentTime(now);

        fetch("https://api.ipify.org?format=json")
            .then(res => res.json())
            .then(data => setIpAddress(data.ip))
            .catch(err => setIpAddress("No disponible"));
    }, []);

    return (
        <div className="fixed inset-0    flex justify-center items-center z-50"
             style={{backgroundColor: 'rgb(0, 0, 0, 0.8)'}}>
            <div className="bg-white p-6 rounded-xl w-96 relative shadow-lg">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-4 text-2xl font-bold text-gray-600"
                >
                    ×
                </button>
                <h3 className="text-lg font-semibold mb-4 text-center">
                    Confirme que esta es la información que quiere registrar
                </h3>
                <div className="space-y-2 text-sm text-gray-700 mb-4">
                    <p><strong>Número de empleado:</strong> {localStorage.getItem('username')}</p>
                    <p><strong>Evento:</strong> {data.event}</p>
                    <p><strong>Hora de registro:</strong> {currentTime}</p>
                    <p><strong>IP actual:</strong> {ipAddress}</p>
                    <p><strong>Comentarios:</strong> {data.comments || "(Sin comentarios)"}</p>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onConfirm}
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

export default PopUp;
