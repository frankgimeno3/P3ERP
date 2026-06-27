import React, { FC, useEffect, useState } from "react";
import UserSerivce from "@/app/service/UserSerivce";
import { UserType } from "./UserType";
 
interface PopUpCrearProps {
    onClose: () => void;
    onCreate: (user: UserType, role: string) => void; // agregamos role
}

const PopUpCrear: FC<PopUpCrearProps> = ({ onClose, onCreate }) => {
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [role, setRole] = useState<string>("Agente"); // rol por defecto

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

     useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEsc);

        return () => {
            window.removeEventListener("keydown", handleEsc);
        };
    }, [onClose]);
    
    const handleCreate = async () => {
        try {
            setLoading(true);
            const createdUser: UserType = await UserSerivce.createUser(name, email, password);
            onCreate(createdUser, role);
            onClose();
        } catch (error: any) {
            setError(error.message);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 flex justify-center items-center z-50 text-gray-600"
            style={{ backgroundColor: "rgb(0, 0, 0, 0.8)" }}
        >
            <div className="bg-white p-6 rounded-xl w-96 relative shadow-lg">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-4 text-2xl font-bold text-gray-600"
                >
                    ×
                </button>
                <h3 className="text-lg font-semibold mb-4 text-center">
                    Introduzca los datos del nuevo usuario
                </h3>
                <div className="space-y-4 mb-4">
                    <div className="flex flex-col">
                        <label className="text-sm text-gray-700">Nombre</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="px-4 py-2 border rounded-xl"
                            placeholder="Nombre del usuario"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm text-gray-700">Email</label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="px-4 py-2 border rounded-xl"
                            placeholder="Correo electrónico"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm text-gray-700">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="px-4 py-2 border rounded-xl"
                            placeholder="Contraseña"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm text-gray-700">Rol</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="px-4 py-2 border rounded-xl"
                        >
                            <option value="Agente">Agente</option>
                            <option value="Administración">Administración</option>
                            <option value="Moderador">Operaciones</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={handleCreate}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700"
                    >
                        Crear
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-gray-300 px-4 py-2 rounded-xl hover:bg-gray-400"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PopUpCrear;
