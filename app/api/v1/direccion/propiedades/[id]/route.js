import {NextResponse} from 'next/server';
import {getProperty,saveProperty} from '@/server/features/propiedades/PropertyRepository.js';
import {propertyFailure} from '../PropertyFailure.js';
export const runtime='nodejs';
export async function GET(_request,{params}){
 try{return NextResponse.json(await getProperty((await params).id));}catch(error){return propertyFailure(error);}
}
export async function PUT(request,{params}){
 try{return NextResponse.json(await saveProperty((await params).id,await request.json()));}catch(error){return propertyFailure(error);}
}
