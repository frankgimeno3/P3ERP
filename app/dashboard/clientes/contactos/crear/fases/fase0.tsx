import React, { FC, ChangeEvent, useState } from 'react';
import { SelectCountryPrefix } from './fasescomponents/SelectCountryPrefix';

interface Fase0Props {
    setFaseCrearContacto: React.Dispatch<React.SetStateAction<number>>;
    setNombre: React.Dispatch<React.SetStateAction<string>>;
    setApellidos: React.Dispatch<React.SetStateAction<string>>;
    setTelefono: React.Dispatch<React.SetStateAction<string>>;
    setMail: React.Dispatch<React.SetStateAction<string>>;
}

const Fase0: FC<Fase0Props> = ({
    setFaseCrearContacto,
    setNombre,
    setApellidos,
    setTelefono,
    setMail,
}) => {
    const [nombreLocal, setNombreLocal] = useState('');
    const [apellidosLocal, setApellidosLocal] = useState('');
    const [prefijoLocal, setPrefijoLocal] = useState('');
    const [telefonoLocal, setTelefonoLocal] = useState('');
    const [emailLocal, setEmailLocal] = useState('');
    const [showSelect, setShowSelect] = useState(false);
    const [errorMessage, setErrorMessage] = useState(''); // mensaje de error

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
        setter(e.target.value);
    };

    const isEmailValid = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const isFormValid =
        nombreLocal.trim() !== '' &&
        apellidosLocal.trim() !== '' &&
        telefonoLocal.trim() !== '' &&
        emailLocal.trim() !== '' &&
        isEmailValid(emailLocal);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isFormValid) {
            setFaseCrearContacto(1);
            setErrorMessage('');
        } else {
            setErrorMessage('Rellena los datos requeridos para continuar');
        }
    };

    return (
        <div className="p-10 px-8 md:px-56 bg-white rounded-2xl shadow-md max-w-5xl mx-auto text-center">
            <h2 className="text-xl font-semibold mb-4 pt-10">
                Introduzca los datos del nuevo contacto
            </h2>
            <p className="text-gray-400 text-justify italic mb-1">
                A continuación vamos a introducir los datos obligatorios para crear el contacto.
            </p>
            <p className="text-gray-400 text-justify italic mb-4">
                Más adelante, podrá ir a la ficha y añadir datos adicionales.
            </p>
            <form
                className="flex flex-col gap-3 pt-4 pb-12"
                onSubmit={handleSubmit} // manejamos submit con Enter
            >
                <input
                    type="text"
                    placeholder="Nombre de la persona"
                    className="border p-2 rounded-lg border-gray-200"
                    value={nombreLocal}
                    onChange={(e) => {
                        handleChange(e, setNombreLocal);
                        handleChange(e, setNombre);
                    }}
                />
                <input
                    type="text"
                    placeholder="Apellidos"
                    className="border p-2 rounded-lg border-gray-200"
                    value={apellidosLocal}
                    onChange={(e) => {
                        handleChange(e, setApellidosLocal);
                        handleChange(e, setApellidos);
                    }}
                />

                <div className="flex gap-2">
                    <SelectCountryPrefix
                        value={prefijoLocal}
                        startingValue={"34"}
                        onChange={(val) => {
                            setPrefijoLocal(val.replace('+', ''));
                        }}
                        showSelect={showSelect}
                        setShowSelect={setShowSelect}
                    />
                    <input
                        type="tel"
                        placeholder="Teléfono"
                        className="flex-1 border border-gray-200 p-2 rounded-lg"
                        value={telefonoLocal}
                        onChange={(e) => {
                            handleChange(e, setTelefonoLocal);
                            handleChange(e, setTelefono);
                        }}
                    />
                </div>

                <input
                    type="email"
                    placeholder="Correo electrónico"
                    className="border p-2 rounded-lg border-gray-200"
                    value={emailLocal}
                    onChange={(e) => {
                        handleChange(e, setEmailLocal);
                        handleChange(e, setMail);
                    }}
                />
                {emailLocal && !isEmailValid(emailLocal) && (
                    <p className="text-gray-300 text-sm">
                        Se requiere un email con este formato xxxxx@aaa.zz
                    </p>
                )}

                <button
                    type="submit" // cambiamos a submit para usar Enter
                    className={`rounded-lg px-4 py-2 mt-5 transition ${isFormValid
                        ? 'bg-blue-900 text-white cursor-pointer hover:bg-blue-600'
                        : 'bg-blue-900/50 text-white cursor-not-allowed'
                        }`}
                >
                    Ir a fase siguiente
                </button>

                {errorMessage && (
                    <p className="text-red-300 mt-2">{errorMessage}</p>
                )}
            </form>
        </div>
    );
};

export default Fase0;
