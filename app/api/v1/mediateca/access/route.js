import { NextResponse } from 'next/server';
export function GET(request) {
  return NextResponse.json({ canManageFolders: ['direccion','superadmin'].includes(request.headers.get('x-p3-actor-role')) });
}
