"use client";
import { useParams } from 'next/navigation';
import { ServicePage } from '../Catalogo';
export default function Page(){const {id}=useParams<{id:string}>();return <ServicePage key={id} id={id}/>;}
