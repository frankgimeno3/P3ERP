"use client";
import { useParams } from 'next/navigation';
import { ChannelPage } from '../../Catalogo';
export default function Page(){const {id}=useParams<{id:string}>();return <ChannelPage key={id} id={id}/>;}
