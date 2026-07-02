import React, { FC } from 'react';
import DatosEmpresaContacto from './DatosEmpresaContacto';
import DatosGralesContacto from './DatosGralesContacto';
import OtrosDatosContacto from './OtrosDatosContacto';
import { InterfazContacto } from '@/app/interfaces/interfaces';
 

interface ContenidoGeneralContactoProps {
  contacto: InterfazContacto;
  setContactoEditable: React.Dispatch<React.SetStateAction<InterfazContacto | undefined>>;
  setIsContenidoEdited: (val: boolean) => void;
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
}

const ContenidoGeneralContacto: FC<ContenidoGeneralContactoProps> = ({
  contacto,
  setContactoEditable,
  setIsContenidoEdited,
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
}) => {
  const handleAnyChange = () => {
    setIsContenidoEdited(true);
  };

  return (
    <div>
      <DatosGralesContacto 
        contacto={contacto} 
        setContactoEditable={setContactoEditable}
        onChange={handleAnyChange} 
      />
      <DatosEmpresaContacto 
        contacto={contacto} 
        setContactoEditable={setContactoEditable}
        onChange={handleAnyChange} 
      />
      <OtrosDatosContacto 
        contacto={contacto}
        setContactoEditable={setContactoEditable}
        suscripciones={suscripciones}
        setSuscripciones={setSuscripciones}
        otrosDatos={otrosDatos}
        setOtrosDatos={setOtrosDatos}
        idiomas={idiomas}
        setIdiomas={setIdiomas}
        pais={pais}
        setPais={setPais}
        conocidoEn={conocidoEn}
        setConocidoEn={setConocidoEn}
        contactadoEnFeria={contactadoEnFeria}
        setContactadoEnFeria={setContactadoEnFeria}
        onChange={handleAnyChange} 
      />
    </div>
  );
};

export default ContenidoGeneralContacto;
