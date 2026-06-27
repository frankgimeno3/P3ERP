import { InterfazContacto } from "@/app/interfaces/interfaces";
import React, { FC } from "react";
 
interface OtrosDatosContactoProps {
  contacto: InterfazContacto;
  setContactoEditable: React.Dispatch<React.SetStateAction<InterfazContacto | undefined>>;
  suscripciones: string[];
  setSuscripciones: React.Dispatch<React.SetStateAction<string[]>>;
  otrosDatos: string;
  setOtrosDatos: React.Dispatch<React.SetStateAction<string>>;
  idiomas: string;
  setIdiomas: React.Dispatch<React.SetStateAction<string>>;
  pais: string;
  setPais: React.Dispatch<React.SetStateAction<string>>;
  conocidoEn: string;
  setConocidoEn: React.Dispatch<React.SetStateAction<string>>;
  contactadoEnFeria: string;
  setContactadoEnFeria: React.Dispatch<React.SetStateAction<string>>;
  onChange: () => void;
}

const OtrosDatosContacto: FC<OtrosDatosContactoProps> = ({ 
  contacto,
  setContactoEditable,
  suscripciones,
  setSuscripciones,
  otrosDatos,
  setOtrosDatos,
  idiomas,
  setIdiomas,
  pais,
  setPais,
  conocidoEn,
  setConocidoEn,
  contactadoEnFeria,
  setContactadoEnFeria,
  onChange
}) => {

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

  const toggleSuscripcion = (opcion: string) => {
    const nuevasSuscripciones = suscripciones.includes(opcion)
      ? suscripciones.filter((s) => s !== opcion)
      : [...suscripciones, opcion];

    setSuscripciones(nuevasSuscripciones);
    setContactoEditable(prev => 
      prev ? { ...prev, suscripciones: nuevasSuscripciones } : prev
    );
    onChange();
  };

  const handleOtrosDatosChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setOtrosDatos(value);
    setContactoEditable(prev => 
      prev ? { ...prev, otros_datos_interes: value } : prev
    );
    onChange();
  };

  const handleIdiomasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIdiomas(value);
    setContactoEditable(prev => 
      prev ? { ...prev, idiomas: value } : prev
    );
    onChange();
  };

  const handlePaisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPais(value);
    setContactoEditable(prev => 
      prev ? { ...prev, pais_contacto: value } : prev
    );
    onChange();
  };

  const handleConocidoEnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConocidoEn(value);
    setContactoEditable(prev => 
      prev ? { ...prev, conocido_en: value } : prev
    );
    onChange();
  };

  const handleContactadoEnFeriaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContactadoEnFeria(value);
    setContactoEditable(prev => 
      prev ? { ...prev, contactado_en_feria: value } : prev
    );
    onChange();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Otros datos del contacto</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <label className="w-1/3 text-gray-700">País</label>
            <input
              type="text"
              value={pais}
              onChange={handlePaisChange}
              className="flex-1 border border-gray-300 rounded-lg p-2 text-gray-700"
              placeholder="Ej: España"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="w-1/3 text-gray-700">Idiomas</label>
            <input
              type="text"
              value={idiomas}
              onChange={handleIdiomasChange}
              className="flex-1 border border-gray-300 rounded-lg p-2 text-gray-700"
              placeholder="Ej: Español, Inglés"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="w-1/3 text-gray-700">Conocido en</label>
            <input
              type="text"
              value={conocidoEn}
              onChange={handleConocidoEnChange}
              className="flex-1 border border-gray-300 rounded-lg p-2 text-gray-700"
              placeholder="Ej: Feria, Referencia..."
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="w-1/3 text-gray-700">Contactado en feria</label>
            <input
              type="text"
              value={contactadoEnFeria}
              onChange={handleContactadoEnFeriaChange}
              className="flex-1 border border-gray-300 rounded-lg p-2 text-gray-700"
              placeholder="Ej: Veteco, Glasstech..."
            />
          </div>
        </div>

         <div>
          <label className="block text-gray-700 mb-2 font-medium">Suscripciones</label>
          <div className="grid grid-cols-2 gap-2">
            {opcionesSuscripciones.map((opcion, idx) => (
              <label key={idx} className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={suscripciones.includes(opcion)}
                  onChange={() => toggleSuscripcion(opcion)}
                  className="h-4 w-4 border-gray-300 rounded"
                />
                {opcion}
              </label>
            ))}
          </div>
        </div>
      </div>

       <h2 className="text-xl font-bold mb-4 mt-6">Otros datos de interés</h2>
      <textarea
        className="border border-gray-300 rounded-lg w-full p-2 text-gray-700"
        placeholder="Introduzca aquí otros datos de interés"
        value={otrosDatos}
        onChange={handleOtrosDatosChange}
        rows={4}
      />
    </div>
  );
};

export default OtrosDatosContacto;
