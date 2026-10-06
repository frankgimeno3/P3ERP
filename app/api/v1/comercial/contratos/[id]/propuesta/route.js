import {NextResponse} from 'next/server';
import {getContratoById} from '@/server/features/contrato/ContratoRepository.js';
import {contractProposalPayload} from '@/server/features/contrato/ContractProposal.js';
import {createPropuesta} from '@/server/features/propuesta/PropuestaRepository.js';
import {taskIdentity,requireTaskIdentity} from '@/server/features/laboral/TaskAccess.js';
import {canManageAccountTasks} from '@/app/config/accountTasks.js';
import {getPgPool} from '@/server/database/pgClient.js';
export const runtime='nodejs';
export async function POST(request,context){
  try{
    const actor=taskIdentity(request);requireTaskIdentity(actor);
    if(!canManageAccountTasks(actor.role))return NextResponse.json({message:'Necesitas un rol comercial para crear propuestas.'},{status:403});
    const {id}=await context.params,contract=await getContratoById(id);
    if(!contract)return NextResponse.json({message:'Contrato no encontrado.'},{status:404});
    const payments=(await getPgPool().query('SELECT * FROM comercial_contratos_cobros WHERE id_contrato=$1 ORDER BY numero_cobro',[id])).rows;
    const proposal=await createPropuesta(contractProposalPayload(contract,actor.id,payments),actor.id);
    return NextResponse.json(proposal,{status:201});
  }catch(error){return NextResponse.json({message:error.message||'No se pudo crear la propuesta.'},{status:error.status||400});}
}
