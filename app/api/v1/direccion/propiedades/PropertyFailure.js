import {NextResponse} from 'next/server';
export function propertyFailure(error){
 const conflict=['23505','23503'].includes(error.code);
 return NextResponse.json({message:conflict?'El identificador o la referencia ya están registrados, o el registro asociado ha cambiado.':error.message||'No se pudo guardar la propiedad.'},{status:error.status||(conflict?409:500)});
}
