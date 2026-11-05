import {NextResponse} from 'next/server';
import {listProperties,propertyOptions,saveProperty} from '@/server/features/propiedades/PropertyRepository.js';
import {propertyFailure} from './PropertyFailure.js';
export const runtime='nodejs';
export async function GET(){
 try{return NextResponse.json({propiedades:await listProperties(),...await propertyOptions()});}catch(error){return propertyFailure(error);}
}
export async function POST(request){
 try{return NextResponse.json(await saveProperty(null,await request.json()),{status:201});}catch(error){return propertyFailure(error);}
}
