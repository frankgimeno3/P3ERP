import React, { FC, useRef } from 'react';
import { useRouter } from "next/navigation";

interface ConfigExportacion {
    paises: string[];
    actividades: string[];
    presenteEnQQ: string[];
    campos: string[];
    idsCuentas: string[];
}

interface F1expcProps {
    setFaseExportacionCuenta: (n: number) => void;
    configuracion: ConfigExportacion;
    setConfiguracion: React.Dispatch<React.SetStateAction<ConfigExportacion>>;
}

const F1expc: FC<F1expcProps> = ({
    setFaseExportacionCuenta,
    configuracion,
    setConfiguracion
}) => {

    const router = useRouter();

    const camposDatos = [
        "ID de la cuenta",
        "Nombre de la empresa",
        "País de la cuenta",
        "ID del agente",
        "Descripción de la cuenta",
        "Actividades de la cuenta",
        "Presente en QQ",
        "Fuente de novedades",
        "Ciudad principal",
        "Teléfono principal",
        "Categoría principal",
        "Contacto principal",
        "Resumen de actividad"
    ];

    const actividades = [
        "Transformador de vidrio",
        "Cristalería",
        "Grandes almacenes"
    ];

    const isPresenteInQQ = ["Aparece en último QQ", "No aparece en último QQ"];

    const paisesRef = useRef<HTMLInputElement>(null);
    const idsCuentasRef = useRef<HTMLTextAreaElement>(null);

    const handleContinuar = () => {
        const paises = paisesRef.current?.value.split(',').map(x => x.trim()).filter(x => x) || [];
        const actividadesChecked = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="idioma"]:checked')).map(el => el.value);
        const presenteEnQQChecked = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="sus"]:checked')).map(el => el.value);
        const camposChecked = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="campo"]:checked')).map(el => el.value);
        const idsCuentas = idsCuentasRef.current?.value.split(',').map(x => x.trim()).filter(x => x) || [];

        setConfiguracion({
            paises,
            actividades: actividadesChecked,
            presenteEnQQ: presenteEnQQChecked,
            campos: camposChecked,
            idsCuentas
        });

        setFaseExportacionCuenta(2);
    };

    return (
        <div className="bg-white mx-12 my-6 p-12 rounded-xl shadow">
            <div className="flex flex-row items-center justify-between mb-12">
                <p className="font-semibold text-3xl text-blue-950">Exportación de cuentas</p>
                <button
                    className="bg-blue-950 hover:bg-blue-950/50 cursor-pointer text-white rounded-lg shadow-xl px-3 py-2"
                    onClick={() => { router.push("/dashboard/operaciones/data/exportar/contactos") }}
                >
                    Deseo exportar contactos
                </button>
            </div>

            <section className="py-12 border border-gray-100 rounded shadow px-8">
                <p className="font-semibold text-xl">Filtraje de cuentas</p>
                <p className="text-sm text-gray-700">
                    Introduzca los parámetros por los que quiere filtrar los cuentas
                </p>
                <div className="flex flex-row mt-12">
                    <div className="flex-1 pr-8">
                        <label className="block text-sm font-bold">Filtrar por país</label>
                        <label className="block text-sm font-medium mb-5">Introduzca en minúsculas y separados por comas</label>
                        <input
                            ref={paisesRef}
                            type="text"
                            className="border border-gray-300 rounded-md px-2 py-1 w-full"
                            placeholder="Ej: España"
                        />
                    </div>

                    <div className="flex-1 ">
                        <fieldset className="space-y-1 flex flex-wrap gap-5 px-8">
                            <legend className="text-sm font-bold mb-8">Filtrar por actividades de la cuenta</legend>
                            {actividades.map((i) => (
                                <label key={i} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="idioma" value={i} /> {i}
                                </label>
                            ))}
                        </fieldset>
                    </div>

                    <div className="flex-1">
                        <fieldset className="space-y-1 flex flex-wrap gap-5 px-8">
                            <legend className="text-sm font-bold mb-8">Filtrar por presente en QQ</legend>
                            {isPresenteInQQ.map((s) => (
                                <label key={s} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="sus" value={s} /> {s}
                                </label>
                            ))}
                        </fieldset>
                    </div>
                </div>

                <label className="block text-sm mt-8 font-bold">Exportar todos los cuentas de cuentas específicas</label>
                <label className="block text-sm mb-2">Introduzca códigos de empresa separados por comas</label>
                <textarea
                    ref={idsCuentasRef}
                    className="border border-gray-300 rounded-md px-2 py-1 w-full min-h-[80px]"
                    placeholder="1001,1002,1003"
                />
            </section>

            <section className="space-y-2 border border-gray-100 rounded shadow p-8">
                <p className="font-semibold text-xl">Filtraje de datos</p>
                <p className="text-sm text-gray-700">
                    Seleccione los valores que quiere que se muestren en el excel resultante para cada cuenta
                </p>

                <fieldset className="grid grid-cols-2 gap-2">
                    {camposDatos.map((c) => (
                        <label key={c} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="campo" value={c} /> {c}
                        </label>
                    ))}
                </fieldset>
            </section>

            <button
                className="bg-blue-950 text-white font-bold cursor-pointer hover:bg-blue-950/90 rounded-lg shadow-xl px-3 py-2 my-12"
                onClick={handleContinuar}
            >
                Continuar y descargar
            </button>
        </div>
    );
};

export default F1expc;
