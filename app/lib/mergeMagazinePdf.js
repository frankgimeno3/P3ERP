export async function mergeMagazinePdf(manifest, read=async file=>{
  const response=await fetch(file.url);if(!response.ok)throw Error('No se pudo descargar uno de los PDF finales. Actualiza la maqueta y reintenta.');
  return new Uint8Array(await response.arrayBuffer());
},onProgress=message=>{void message;}) {
  const {PDFDocument}=await import('pdf-lib');
  if(!manifest||!Array.isArray(manifest.files)||!manifest.files.length||!Array.isArray(manifest.pages)||manifest.pages.length!==manifest.total||manifest.total<2||manifest.total>1000||manifest.total%2)throw Error('La maqueta no contiene una secuencia válida de páginas.');
  const output=await PDFDocument.create(),documents=new Map();let bytes=0,blankSize=[595.28,841.89];
  for(let index=0;index<manifest.files.length;index++) {
    const file=manifest.files[index];onProgress(`Descargando PDF ${index+1} de ${manifest.files.length}…`);
    const raw=await read(file);bytes+=raw.length;if(bytes>200*1024*1024)throw Error('La descarga conjunta supera 200 MB.');
    let document;try{document=await PDFDocument.load(raw,{updateMetadata:false});}catch{throw Error('Uno de los archivos finales no es un PDF válido o requiere contraseña.');}
    if(document.isEncrypted||document.getPageCount()!==Number(file.paginas))throw Error('Las páginas del PDF final han cambiado. Revisa la maqueta antes de descargar.');
    if(index===0){const {width,height}=document.getPage(0).getSize();blankSize=[width,height];}
    documents.set(file.id,document);
  }
  onProgress('Uniendo las páginas en el orden de la maqueta…');
  for(const page of manifest.pages) {
    if(!page){output.addPage(blankSize);continue;}
    const source=documents.get(page.material);
    if(!source||!Number.isInteger(page.index)||page.index<0||page.index>=source.getPageCount())throw Error('La maqueta referencia una página que no existe en su PDF.');
    const [copied]=await output.copyPages(source,[page.index]);output.addPage(copied);
  }
  output.setTitle(manifest.nombre||'Maqueta');output.setCreator('P3ERP');
  return output.save();
}
