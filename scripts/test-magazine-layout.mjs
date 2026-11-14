import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {buildMagazineLayout,physicalPageNumber,layoutPageLabel,validateLayoutEntry} from '../app/lib/magazineLayout.js';
import {mergeMagazinePdf} from '../app/lib/mergeMagazinePdf.js';
import {pdfPageCount} from '../server/features/produccion/FinalContentPdf.js';

const state='Material OK - pendiente de publicar';
const row=(id,pos,pages=1,section='Noticias',format='impreso_digital')=>({id_contenido:id,tipo:'articulos',nombre_contenido:id,estado_contenido:state,formato_revista:format,
 maquetacion_produccion:{articulos:{posicion:pos,paginas:pages,seccion:section,id_material:'pdf-'+id}},materiales:[{id_material:'pdf-'+id,es_version_acabada:true,pdf_paginas:pages}]});
const contents=[row('cover',-1,1,'Inicial'),row('inside',0,1,'Inicial'),row('article',1,3,'Noticias'),row('digital',4,1,'Digital','digital')];
const model=buildMagazineLayout(contents,[],'impresa',8);
assert.equal(model.total,8);assert.equal(model.spreads[0][0],null);assert.equal(model.spreads[0][1].posicion,-1);
assert.equal(model.spreads.at(-1)[1],null);assert.equal(model.spreads.at(-1)[0].posicion,6);
assert.deepEqual(model.pages.slice(2,5).map(page=>page.parte),[1,2,3]);
assert.equal(model.pages[2].fisica,3);assert.equal(physicalPageNumber(-1),1);assert.equal(physicalPageNumber(1),3);
assert.equal(layoutPageLabel(0),'Interior portada');assert.equal(model.items.length,3);assert.equal(model.issues.length,0);
assert.equal(model.sections[0].name,'Inicial');assert.equal(model.sections[0].height,1.5);assert.equal(model.sections.at(-1).height+model.sections.at(-1).top,model.spreads.length);
assert.equal(buildMagazineLayout(contents,[],'digital',9).total,10);
assert(buildMagazineLayout([...contents,row('collision',2)],[],'impresa').issues.some(issue=>issue.includes('coinciden')));
const missing=row('missing',3);missing.materiales=[];assert.equal(buildMagazineLayout([missing],[],'impresa').unplaced.length,1);
assert.throws(()=>validateLayoutEntry({...contents[0].maquetacion_produccion.articulos,id_contenido:'x',tipo:'articulos',paginas:1.5}),/entero/);
assert.throws(()=>validateLayoutEntry({id_contenido:'x',tipo:'anuncios',paginas:1,posicion:'',seccion:'',id_material:''}),/posición/);
const entry={...contents[0].maquetacion_produccion.articulos,id_contenido:'cover',tipo:'articulos'};
const changed={...contents[0],estado_contenido:'Pendiente revisión cliente'};
assert.equal(buildMagazineLayout([changed],[entry],'impresa',8,true).items.length,1,'Una publicación conserva las asignaciones ya fijadas');
assert.equal(buildMagazineLayout([changed],[entry],'impresa',8,false).orphans.length,1);
assert.equal(buildMagazineLayout(contents,[entry],'impresa',8,true).items.length,1,'Los contenidos nuevos no entran automáticamente en una maqueta publicada');

async function pdf(widths){const doc=await PDFDocument.create();for(const width of widths)doc.addPage([width,400]).drawText(`Width ${width}`,{x:10,y:10,size:8});return doc.save();}
const sources={cover:await pdf([111]),article:await pdf([222,333]),ad:await pdf([444])};
assert.equal(await pdfPageCount(sources.article),2);await assert.rejects(pdfPageCount(Buffer.from('not a pdf')),/PDF válido/);
const manifest={nombre:'Prueba',total:6,files:[{id:'article',paginas:2},{id:'ad',paginas:1},{id:'cover',paginas:1}],pages:[{material:'cover',index:0},null,{material:'article',index:0},{material:'article',index:1},{material:'ad',index:0},null]};
const output=await PDFDocument.load(await mergeMagazinePdf(manifest,async file=>sources[file.id]));
assert.deepEqual(output.getPages().map(page=>page.getSize().width),[111,222,222,333,444,222]);
assert.equal(output.getPageCount(),6,'No añade la celda vacía anterior a portada y conserva los huecos reales');
await assert.rejects(mergeMagazinePdf({...manifest,files:[{id:'article',paginas:1}]},async file=>sources[file.id]),/páginas.*cambiado/);
await assert.rejects(mergeMagazinePdf(manifest,async()=>{throw Error('Fallo de red');}),/Fallo de red/);
console.log('PASS: portada derecha, final izquierdo, ordinales, partes, secciones, formatos, huecos, PDF originales ordenados y descargas fallidas sin archivo parcial.');
