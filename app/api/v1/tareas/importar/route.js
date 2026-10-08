import {NextResponse} from 'next/server';
import {taskIdentity} from '@/server/features/laboral/TaskAccess.js';
import {taskImportOptions,importVtigerTasks} from '@/server/features/laboral/VtigerTaskRepository.js';
async function handle(request){
  try{
    const actor=taskIdentity(request);
    if(request.method==='GET')return NextResponse.json(await taskImportOptions(actor));
    if(Number(request.headers.get('content-length'))>12*1024*1024)return NextResponse.json({message:'Archivo demasiado grande.'},{status:413});
    const body=await request.json();
    return NextResponse.json(await importVtigerTasks(actor,body,body.confirm===true));
  }catch(error){return NextResponse.json({message:error.status?error.message:'No se pudo procesar la importación.'},{status:error.status||500});}
}
export {handle as GET,handle as POST};
