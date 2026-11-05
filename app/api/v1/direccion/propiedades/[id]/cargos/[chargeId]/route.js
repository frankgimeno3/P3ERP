import {NextResponse} from 'next/server';
import {detachPropertyCharge,propertyTransaction} from '@/server/features/propiedades/PropertyRepository.js';
import {propertyFailure} from '../../../PropertyFailure.js';
export const runtime='nodejs';
export async function DELETE(request,{params}){
 try{
  const {id,chargeId}=await params,body=await request.json();
  return NextResponse.json(await propertyTransaction(db=>detachPropertyCharge(db,id,chargeId,body.expectedVersion)));
 }catch(error){return propertyFailure(error);}
}
