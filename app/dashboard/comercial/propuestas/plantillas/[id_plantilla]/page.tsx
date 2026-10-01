'use client';
import { useParams } from 'next/navigation';
import TemplateEditor from '../TemplateEditor';
export default function EditarPlantillaPage(){const {id_plantilla}=useParams<{id_plantilla:string}>();return <TemplateEditor id={id_plantilla}/>;}
