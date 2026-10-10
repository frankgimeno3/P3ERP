import {NextResponse} from 'next/server';
import {updateArticle} from '../../../../../../server/features/controlRedaccion/ControlRedaccionRepository.js';
export const runtime='nodejs';
export async function PATCH(request,{params}){
 try{const {id}=await params;return NextResponse.json(await updateArticle(id,await request.json()));}
 catch(error){return NextResponse.json({message:error.status?error.message:'No se pudo guardar el artículo.'},{status:error.status||500});}
}
