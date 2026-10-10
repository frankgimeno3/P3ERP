import {resolveIdentifier} from '@/server/features/identifiers/IdentifierAliases.js';
import { NextResponse } from 'next/server';
import { taskIdentity } from '@/server/features/laboral/TaskAccess.js';
import { accountTasks, readAccountTask, saveAccountTask } from '@/server/features/cuenta/AccountTaskRepository.js';
import { canManageAccountTasks } from '@/app/config/accountTasks.js';

export const runtime = 'nodejs';
async function handle(request, context) {
  try {
    const { id_cuenta:oldAccount, task = [] } = await context.params;
    const id_cuenta=await resolveIdentifier('cuenta',oldAccount);
    if (task.length > 1) return NextResponse.json({ message: 'No encontrado.' }, { status: 404 });
    const actor = taskIdentity(request), id = task[0];
    if (request.method === 'GET') return NextResponse.json(id ? await readAccountTask(actor,id,id_cuenta) : { rows: await accountTasks(actor,{accountId:id_cuenta}), puede_editar: canManageAccountTasks(actor.role) });
    if (request.method === 'POST' && id || request.method !== 'POST' && !id) return NextResponse.json({ message: 'Ruta no válida.' }, { status: 405 });
    return NextResponse.json(await saveAccountTask(actor,id_cuenta,id,await request.json(),request.method === 'PATCH'), { status: request.method === 'POST' ? 201 : 200 });
  } catch (error) { return NextResponse.json({ message: error.status ? error.message : 'No se pudo guardar la tarea.' }, { status: error.status || 500 }); }
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH };
