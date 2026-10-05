import {NextResponse} from 'next/server';
import {getPreliminaryFlatplan,updatePreliminaryFlatplan} from '@/server/features/produccion/PreliminaryFlatplanRepository.js';
export const runtime='nodejs';
export async function GET(_request,{params}) {
 try{const {id_revista}=await params;const result=await getPreliminaryFlatplan(id_revista);return NextResponse.json(result||{message:'Revista no encontrada'},{status:result?200:404});}
 catch(error){return NextResponse.json({message:error.message},{status:error.status||500});}
}
export async function PATCH(request,{params}) {
 try{const {id_revista}=await params;const result=await updatePreliminaryFlatplan(id_revista,await request.json());return NextResponse.json(result||{message:'Revista no encontrada'},{status:result?200:404});}
 catch(error){return NextResponse.json({message:error.message},{status:error.status||400});}
}
