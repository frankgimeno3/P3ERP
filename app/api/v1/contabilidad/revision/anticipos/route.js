import { GET as laboralGet } from '@/app/api/v1/direccion/laboral/[...path]/route.js';

export function GET(request) {
  return laboralGet(request, { params: Promise.resolve({ path: ['anticipos'] }) });
}
export const runtime='nodejs';
export const dynamic='force-dynamic';
