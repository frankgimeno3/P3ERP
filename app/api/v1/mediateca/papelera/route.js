import { listMediaTrash, restoreMediaTrash } from '@/server/features/mediateca/MediatecaTrashRepository.js';
export const runtime = 'nodejs';
export async function GET() {
  try { return Response.json(await listMediaTrash()); }
  catch { return Response.json({ message: 'No se pudo cargar la papelera.' }, { status: 500 }); }
}
export async function POST(request) {
  try { return Response.json(await restoreMediaTrash((await request.json()).id, ['operaciones','superadmin'].includes(request.headers.get('x-p3-actor-role')))); }
  catch (error) { return Response.json({ message: error.code === '23505' ? 'Ya existe un archivo o carpeta con esa identidad. No se ha restaurado ni sobrescrito nada.' : error.message }, { status: error.status || (error.code === '23505' ? 409 : 500) }); }
}
