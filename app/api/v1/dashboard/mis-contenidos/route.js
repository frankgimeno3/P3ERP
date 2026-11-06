import {NextResponse} from 'next/server';
import {getMyContents} from '@/server/features/produccion/MyContentsRepository.js';
export const runtime='nodejs';
export async function GET(request) {
 try {return NextResponse.json(await getMyContents(request.headers.get('x-p3-actor-id')));}
 catch(error){return NextResponse.json({message:error.message||'No se pudieron cargar tus contenidos.'},{status:error.status||500});}
}
