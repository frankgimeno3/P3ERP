import * as repo from '@/server/features/laboral/LaboralRepository.js';
import { downloadDocument, uploadDocument } from '@/server/features/laboral/DocumentStorage.js';
import { LaboralError } from '@/server/features/laboral/validation.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request, { params }) {
  try {
    const { path } = await params;
    const [kind, id, child, childId] = path;
    const method = request.method, search = new URL(request.url).searchParams;
    let data;
    if (path.length > 4) throw new LaboralError('Ruta no encontrada.', 404);
    if (kind === 'documentos' && id && !child && method === 'GET') return await downloadDocument(id);
    if (child === 'documentos' && !childId) {
      if (method === 'GET') data = await repo.listDocuments(kind,id);
      else if (method === 'POST') data = await uploadDocument(request,kind,id);
    } else if (kind === 'empleados') {
      if (method === 'GET' && !child) data = id ? await repo.getEmployee(id,search.get('anio') || new Date().getFullYear()) : await repo.listEmployees();
      else if (id && child === 'libres' && !childId && method === 'PUT') data = await repo.saveFreeDays(id,await request.json());
      else if (id && child === 'ausencias' && ['POST','PUT'].includes(method)) data = await repo.saveAbsence(id,childId,await request.json());
      else if (id && child === 'comentarios' && !childId && method === 'POST') data = await repo.addComment(id,await request.json());
      else if (id && childId && ['ausencias','comentarios'].includes(child) && method === 'DELETE') data = await repo.deleteRecord(child,childId,id);
    } else if (['nominas','anticipos'].includes(kind) && !child) {
      if (method === 'GET') data = id ? await repo.getPayment(kind,id) : await repo.listPayments(kind);
      else if ((method === 'POST' && !id) || (method === 'PUT' && id)) data = await repo.savePayment(kind,id,await request.json());
    } else if (kind === 'transferencias' && !id && method === 'GET') data = await repo.listTransfers(search.get('empleado'));
    else if (kind === 'calendarios' && !child) {
      if (method === 'GET') data = id ? await repo.getCalendar(id) : await repo.listCalendars();
      else if (method === 'POST' && !id) data = await repo.createCalendar(await request.json());
    } else if (kind === 'eventos' && !child) {
      if ((method === 'POST' && !id) || (method === 'PUT' && id)) data = await repo.saveEvent(id,await request.json());
      else if (method === 'DELETE' && id) data = await repo.deleteRecord('eventos',id);
    } else if (kind === 'procesos') {
      if (!child && method === 'GET') data = id ? await repo.getProcess(id) : await repo.listProcesses();
      else if (!child && ((method === 'POST' && !id) || (method === 'PUT' && id))) data = await repo.saveProcess(id,await request.json());
      else if (id && child === 'candidatos' && ((method === 'POST' && !childId) || (method === 'PUT' && childId))) data = await repo.saveCandidate(id,childId,await request.json());
      else if (id && child === 'candidatos' && childId && method === 'DELETE') data = await repo.deleteRecord('candidatos',childId,id);
    }
    if (data === undefined) throw new LaboralError('Ruta u operación no encontrada.', 404);
    return Response.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const status = error.status || (error.code === '23505' ? 409 : error.code === '23503' || error.code === '23514' || error instanceof SyntaxError ? 400 : 500);
    const message = error.code === '23505' ? 'Ya existe un registro para ese empleado y mes, o la transferencia ya está utilizada.' : error.code === '23503' ? 'El registro relacionado no existe o sigue en uso.' : error.code === '23514' ? 'Los datos no cumplen las condiciones del registro.' : status === 500 ? 'No se pudo completar la operación laboral.' : error.message;
    if (status === 500) console.error('Laboral request failed:', error.name, error.code || '');
    return Response.json({ message }, { status });
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
