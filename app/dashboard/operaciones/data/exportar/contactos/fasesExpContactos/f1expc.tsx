import React, { FC, useRef } from 'react';
import { useRouter } from "next/navigation";

interface ConfigExportacion {
    paises: string[];
    idiomas: string[];
    suscripciones: string[];
    idsCuentas: string[];
    idsContactos: string[];
    camposExcel: string[];
}

interface F1expcProps {
    setFaseExportacionContacto: (n: number) => void;
    configuracion: ConfigExportacion;
    setConfiguracion: React.Dispatch<React.SetStateAction<ConfigExportacion>>;
}

const F1expc: FC<F1expcProps> = ({
    setFaseExportacionContacto,
    configuracion,
    setConfiguracion
}) => {

    const router = useRouter();

    const idiomas = ["inglés", "turco", "chino", "portugués", "alemán", "español", "italiano", "otros"];

    const opcionesSuscripciones = [
        "Newsletter Vidrio España",
        "Newsletter Vidrio Latam",
        "Revista del Vidrio España",
        "Revista del vidrio Latam",
        "QQ Vidrio España",
        "Newsletter Ventanas España",
        "Newsletter Ventanas Latam",
        "Revista Ventanas España",
        "Revista Ventanas Latam",
        "QQ Ventanas España",
        "Newsletter Proteccion Solar España",
        "Newsletter Proteccion Solar Latam",
        "Newsletter Puertas España",
        "Newsletter Puertas Latam",
        "Newsletter Arquitectura",
        "Revista Hueco Arquitectura",
    ];

    const camposDatos = [
        "id_contacto", "nombre_contacto", "apellidos_contacto", "nombre_completo_contacto",
        "id_cuenta", "nombre_empresa", "telefono_contacto", "email_contacto", "cargo_contacto",
        "idiomas", "conocido_en", "contactado_en_feria", "suscripciones", "otros_datos_interes", "pais_contacto"
    ];

    // Refs a inputs y textareas
    const paisesRef = useRef<HTMLInputElement>(null);
    const idsCuentasRef = useRef<HTMLTextAreaElement>(null);
    const idsContactosRef = useRef<HTMLTextAreaElement>(null);

    const handleContinuar = () => {
        const paises = paisesRef.current?.value.split(',').map(x => x.trim()).filter(x => x) || [];

        const idiomasChecked = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="idioma"]:checked')).map(el => el.value);

        const suscripcionesChecked = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="sus"]:checked')).map(el => el.value);

        const camposChecked = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="campo"]:checked')).map(el => el.value);

        const idsCuentas = idsCuentasRef.current?.value.split(',').map(x => x.trim()).filter(x => x) || [];

        const idsContactos = idsContactosRef.current?.value.split(',').map(x => x.trim()).filter(x => x) || [];

        setConfiguracion(prev => ({
            ...prev,
            paises,
            idiomas: idiomasChecked,
            suscripciones: suscripcionesChecked,
            camposExcel: camposChecked,
            idsCuentas,
            idsContactos
        }));

        setFaseExportacionContacto(2);
    };

    return (
        <div className="bg-white mx-12 my-6 p-12 rounded-xl shadow">
            <div className="flex flex-row items-center justify-between mb-12">
                <p className="font-semibold text-3xl text-blue-950">Exportación de contactos</p>
                <button
                    className="bg-blue-950 hover:bg-blue-950/50 cursor-pointer text-white rounded-lg shadow-xl px-3 py-2"
                    onClick={() => { router.push("/dashboard/operaciones/data/exportar/cuentas") }}
                >
                    Deseo exportar cuentas
                </button>
            </div>

            <section className="py-12 border border-gray-100 rounded shadow px-8">
                <p className="font-semibold text-xl">Filtraje de contactos</p>
                <p className="text-sm text-gray-700">
                    Introduzca los parámetros por los que quiere filtrar los contactos
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
                            <legend className="text-sm font-bold mb-8">Filtrar por idiomas del contacto</legend>
                            {idiomas.map((i) => (
                                <label key={i} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="idioma" value={i} /> {i}
                                </label>
                            ))}
                        </fieldset>
                    </div>

                    <div className="flex-1">
                        <fieldset className="space-y-1 flex flex-wrap gap-5 px-8">
                            <legend className="text-sm font-bold mb-8">Filtrar por suscripciones del contacto</legend>
                            {opcionesSuscripciones.map((s) => (
                                <label key={s} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="sus" value={s} /> {s}
                                </label>
                            ))}
                        </fieldset>
                    </div>
                </div>

                <label className="block text-sm mt-8 font-bold">Exportar todos los contactos de cuentas específicas</label>
                <label className="block text-sm mb-2">Introduzca códigos de empresa separados por comas</label>
                <textarea
                    ref={idsCuentasRef}
                    className="border border-gray-300 rounded-md px-2 py-1 w-full min-h-[80px]"
                    placeholder="1001,1002,1003"
                />

                <label className="block text-sm mt-8 font-bold">Exportar contactos específicos</label>
                <label className="block text-sm mb-2">Introduzca códigos de contacto separados por comas</label>
                <textarea
                    ref={idsContactosRef}
                    className="border border-gray-300 rounded-md px-2 py-1 w-full min-h-[80px]"
                    placeholder="1001,1002,1003"
                />
            </section>

            <section className="space-y-2 border border-gray-100 rounded shadow p-8">
                <p className="font-semibold text-xl">Filtraje de datos</p>
                <p className="text-sm text-gray-700">
                    Seleccione los valores que quiere que se muestren en el excel resultante para cada contacto
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
