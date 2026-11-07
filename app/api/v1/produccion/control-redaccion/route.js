import {NextResponse} from 'next/server';
import {getControlRedaccion} from '@/server/features/controlRedaccion/ControlRedaccionRepository.js';
export const runtime='nodejs';
export async function GET(){try{return NextResponse.json(await getControlRedaccion());}catch{return NextResponse.json({message:'No se pudieron cargar los contenidos editoriales.'},{status:500});}}
export async function POST(){return NextResponse.json({message:'Los artículos se gestionan como contenidos en Producción > Gestión contenidos.'},{status:410});}
