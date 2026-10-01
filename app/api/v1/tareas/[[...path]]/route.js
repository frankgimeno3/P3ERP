import {NextResponse} from 'next/server';
import {taskIdentity} from '@/server/features/laboral/TaskAccess.js';
import {readTasks,taskEmployees,writeTask,createOwnTask} from '@/server/features/laboral/TaskRepository.js';
async function handle(request,context){
 try{
  const parts=(await context.params).path||[],actor=taskIdentity(request);
  if(parts.length>1)return NextResponse.json({message:'No encontrado.'},{status:404});
  if(request.method==='POST'&&parts[0]==='propias')return NextResponse.json(await createOwnTask(actor,await request.json()),{status:201});
  if(request.method==='GET')return NextResponse.json(parts[0]==='agentes'?await taskEmployees(actor):await readTasks(actor,{id:parts[0],employee:request.nextUrl.searchParams.get('agente')||undefined}));
  if(parts[0]==='agentes'||(request.method==='POST'&&parts.length)||(request.method==='PUT'&&!parts.length))return NextResponse.json({message:'Ruta no válida.'},{status:405});
  return NextResponse.json(await writeTask(actor,parts[0],await request.json()),{status:request.method==='POST'?201:200});
 }catch(error){return NextResponse.json({message:error.status?error.message:'No se pudo procesar la tarea.'},{status:error.status||500});}
}
export {handle as GET,handle as POST,handle as PUT};
