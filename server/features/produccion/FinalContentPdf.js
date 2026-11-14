import {PDFDocument} from 'pdf-lib';
import {readDocumentObject} from '../mediateca/S3Service.js';
import {validateLayoutEntry} from '../../../app/lib/magazineLayout.js';

export async function pdfPageCount(bytes) {
  try {
    if (!Buffer.from(bytes).subarray(0,1024).includes(Buffer.from('%PDF-'))) throw Error();
    const document=await PDFDocument.load(bytes, {updateMetadata:false});
    const count=document.getPageCount();
    if (document.isEncrypted || count<1 || count>1000) throw Error();
    return count;
  } catch { throw Object.assign(new Error('El archivo debe ser un PDF válido, sin contraseña y de entre 1 y 1000 páginas.'), {status:400,statusCode:400}); }
}

export async function verifyFinalContentPdf(db, contentId, config, read=readDocumentObject, magazineIds=null) {
  let entry; try { entry=validateLayoutEntry(config); } catch(error) { throw Object.assign(error,{status:400,statusCode:400}); }
  const material=(await db.query(`SELECT m.*,a.mediateca_s3_key FROM produccion_materiales m
    JOIN mediateca_archivos a ON a.mediateca_content_id::text=m.mediateca_id
    WHERE m.id_material=$1 AND m.id_contenido=$2 AND m.tipo=$3 AND m.es_version_acabada
      AND m.eliminado_at IS NULL AND m.material_valido IS DISTINCT FROM false FOR UPDATE OF m`,[entry.id_material,contentId,entry.tipo])).rows[0];
  if(!material || !material.mediateca_s3_key || (magazineIds && material.id_revista && !magazineIds.includes(material.id_revista))) throw Object.assign(new Error('Selecciona un PDF final de este contenido, tipo y revista.'),{status:400,statusCode:400});
  const count=material.pdf_paginas ?? await pdfPageCount(await read(material.mediateca_s3_key));
  if(Number(count)!==entry.paginas) throw Object.assign(new Error(`El PDF final tiene ${count} páginas; indica esa misma extensión.`),{status:400,statusCode:400});
  if(material.pdf_paginas===null || material.pdf_paginas===undefined) await db.query('UPDATE produccion_materiales SET pdf_paginas=$2,updated_at=clock_timestamp() WHERE id_material=$1',[material.id_material,count]);
  return {...entry, material:{...material,pdf_paginas:Number(count)}};
}
