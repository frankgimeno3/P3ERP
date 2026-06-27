import { useRouter } from 'next/navigation';
import React, { FC, useState } from 'react';

interface VentanaFichajeProps {

}

const VentanaFichaje: FC<VentanaFichajeProps> = ({ }) => {
    const router = useRouter()
    const [hasSigned] = useState("unsigned")
    return (
        <div className='border border-gray-100 rounded-xl shadow p-6 text-center' style={{"width":"400px"}}>
            <p className='font-bold'>Estado del fichaje</p>
            {hasSigned=="signed" ?
                <div>
                    <p>Horas trabajadas hoy: <span>12 horas 13 minutos (última actualización)</span></p>
                    <button className='mt-5 bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900'
                    onClick={()=>{router.push('/dashboard/registro')}}
                    >Fichar salida</button>
                </div>
                :
                <div>
                    <p className='py-4'>Todavía no has fichado</p>
                    <button
                        className='bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900'
                        onClick={()=>{router.push('/dashboard/fichajes')}}
                    >Ficha aquí tu entrada</button>
                </div>}
        </div>
    );
};

export default VentanaFichaje;