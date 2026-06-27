'use client'
import React, {FC, use, useEffect, useState} from 'react';

import UserSerivce from "@/app/service/UserSerivce";
import {UserType} from "./componentesusuarios/UserType";
import PopUpCrear from './componentesusuarios/PopUpCrear';
import PopUpEditar from './componentesusuarios/PopUpEditar';

const Usuarios: FC = () => {
    const handleCrearUsuario = () => {
        setShowPopUpCrear(true);
    };

    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string|null>(null);

    const [showPopUpCrear, setShowPopUpCrear] = useState<boolean>(false);
    const [showPopUpEditar, setShowPopUpEditar] = useState<boolean>(false);
    const [userToEdit, setUserToEdit] = useState<UserType|null>(null);

    const handleClosePopUpCrear = () => {
        setShowPopUpCrear(false);
    };

    const handleClosePopUpEditar = () => {
        setShowPopUpEditar(false);
    };

    const handleCreateUser = (newUser: UserType) => {
        setUsers([...users, newUser]);
        setShowPopUpCrear(false);
    };


    const handlePressEditUser = (user: UserType) => {
        setUserToEdit(user)
        setShowPopUpEditar(true);
    };

    const handleEditUser = (username: string, name: string, email: string, status: boolean) => {
        setUsers(users.map((user)=>{
            if(user.username !== username) return user;

            user.attributes.name = name
            user.attributes.email = name
            user.enabled = status
            return user;
        }))
        setShowPopUpEditar(false);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            setUsers(await UserSerivce.getAllUsers());
        } catch (error: any){
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUsers();
    },[])


    return (
        <>
            <div className="p-6 px-12 bg-gray-100 min-h-screen ">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-xl text-gray-600">Usuarios</p>
                    <button onClick={handleCrearUsuario}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">Crear nuevo usuario
                    </button>
                </div>
                <table className="min-w-full bg-white text-black rounded overflow-hidden">
                    <thead className="bg-gray-200">
                    <tr>
                        <th className="text-left px-4 py-2">Nombre</th>
                        <th className="text-left px-4 py-2">Email</th>
                        <th className="text-left px-4 py-2">Rol</th>
                        <th className="text-left px-4 py-2">Contraseña</th>
                        <th className="text-left px-4 py-2">Estado</th>
                        <th className="text-left px-4 py-2">Editar</th>
                    </tr>
                    </thead>
                    <tbody>
                    {users.map((user, index) => (
                        <tr key={index} className="border-t border-gray-300">
                            <td className="px-4 py-2">{user.attributes.name || "-"}</td>
                            <td className="px-4 py-2">{user.attributes.email}</td>
                            <td className="px-4 py-2">Aquí tiene que ir el rol</td>
                            <td className="px-4 py-2">***</td>
                            <td className="px-4 py-2">{user.enabled ? "Activo" : "Inactivo"}</td>
                            <td className="px-4 py-2">
                                <button
                                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                                    onClick={() => handlePressEditUser(user)}
                                >
                                    Editar
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {showPopUpCrear && (
                <PopUpCrear
                    onClose={handleClosePopUpCrear}
                    onCreate={handleCreateUser}
                />
            )}

            {showPopUpEditar && userToEdit && (
                <PopUpEditar
                    user={userToEdit}
                    onClose={handleClosePopUpEditar}
                    onEdit={handleEditUser}
                />
            )}
        </>
    );
};

export default Usuarios;