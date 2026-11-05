import {NextResponse} from 'next/server';
import {associatePropertyCharge,propertyTransaction} from '@/server/features/propiedades/PropertyRepository.js';
import {propertyFailure} from '../../PropertyFailure.js';
export const runtime='nodejs';
export async function POST(request,{params}){
 try{
  const {id}=await params,body=await request.json();
  return NextResponse.json(await propertyTransaction(db=>associatePropertyCharge(db,id,body)),{status:201});
 }catch(error){return propertyFailure(error);}
}
