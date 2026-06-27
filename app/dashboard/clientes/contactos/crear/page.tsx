"use client"
import React, { FC, useState } from 'react';
import Fase0 from './fases/fase0';
import Fase1 from './fases/fase1';
import Fase2 from './fases/fase2';
 import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

interface CrearContactoProps {
  setFaseCrearContacto: React.Dispatch<React.SetStateAction<number>>;
}

const CrearContacto: FC<CrearContactoProps> = ({ }) => {
  const [faseCrearContacto, setFaseCrearContacto] = useState(0)
  const [nombre, setNombre] = useState("")
  const [apellidos, setApellidos] = useState("")  
  const [telefono, setTelefono] = useState("")
  const [mail, setMail] = useState("")
  const [cargo, setCargo] = useState("")
  const [id_cuenta, setId_Cuenta] = useState("")
   return (
    <div className="flex flex-col  h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal={` Crear contacto  `} />
      <div className="bg-gray-100 h-full min-h-screen p-12 text-gray-600">      
        {faseCrearContacto == 0 && <Fase0 setFaseCrearContacto={setFaseCrearContacto} setNombre={setNombre} setApellidos={setApellidos} 
        setTelefono={setTelefono} setMail={setMail} />}
        {faseCrearContacto == 1 && <Fase1 setFaseCrearContacto={setFaseCrearContacto} />}
        {faseCrearContacto == 2 && <Fase2 setId_Cuenta={setId_Cuenta}  setCargo={setCargo}/>}
       </div>
    </div>
  );
};

export default CrearContacto;