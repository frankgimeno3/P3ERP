'use client';
import type {ReactNode} from 'react';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import styles from './liquidaciones.module.css';

export default function LiquidacionesFrame({title,children,className=''}:{title:string;children:ReactNode;className?:string}){
 return <div className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal={title} currentLabel={title}/><main className={`${styles.content} space-y-6 p-6 lg:px-12 lg:py-10 ${className}`}>{children}</main></div>;
}
