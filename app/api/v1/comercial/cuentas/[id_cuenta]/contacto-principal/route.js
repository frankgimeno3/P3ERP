import { NextResponse } from 'next/server';
import {setContactoPrincipal} from '@/server/features/contacto/ContactoRepository';
import {requestActor} from '@/server/features/comentario/AccountActivity';
export const runtime='nodejs';
export async function PUT(request,context){try{const {id_cuenta}=await context.params;const data=await request.json();return NextResponse.json(await setContactoPrincipal(id_cuenta,data.id_contacto,requestActor(request)));}catch(error){return NextResponse.json({message:error.status?error.message:'No se pudo cambiar el contacto principal.'},{status:error.status || 500});}}
