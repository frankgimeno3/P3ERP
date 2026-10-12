const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
let authorized=false,reads=0,downloads=0;
const mod={exports:{}};
const code=ts.transpileModule(fs.readFileSync('app/api/v1/mediateca/media/[id]/content/route.js','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
new Function('require','module','exports',code)(id=>{
 if(id.includes('MediatecaAccess'))return {assertMediatecaAccess:async()=>{if(!authorized)throw Object.assign(new Error('No tienes acceso.'),{status:403});}};
 if(id.includes('MediatecaRepository'))return {getMediaById:async()=>{reads++;return {s3Key:'private/file.pdf'};}};
 if(id.includes('S3Service'))return {createPresignedDownload:async()=>{downloads++;return 'https://signed.test/file';}};
 throw Error(id);
},mod,mod.exports);
const original=global.fetch;
(async()=>{try{
 const blocked=await mod.exports.GET(new Request('https://erp.test/api/v1/mediateca/media/id/content'),{params:Promise.resolve({id:'id'})});
 assert.equal(blocked.status,403);assert.equal(reads,0);assert.equal(downloads,0);
 authorized=true;
 global.fetch=async(url,options)=>{assert.equal(url,'https://signed.test/file');assert.equal(options.headers.Range,'bytes=0-3');return new Response('data',{status:206,headers:{'content-type':'application/pdf','content-range':'bytes 0-3/4'}});};
 const allowed=await mod.exports.GET(new Request('https://erp.test/api/v1/mediateca/media/id/content',{headers:{range:'bytes=0-3'}}),{params:Promise.resolve({id:'id'})});
 assert.equal(allowed.status,206);assert.equal(allowed.headers.get('cache-control'),'private, no-store');assert.equal(allowed.headers.get('content-type'),'application/pdf');assert.equal(await allowed.text(),'data');assert.equal(downloads,1);
 global.fetch=async()=>new Response('<script>unsafe</script>',{headers:{'content-type':'text/html'}});
 const untrusted=await mod.exports.GET(new Request('https://erp.test/api/v1/mediateca/media/id/content'),{params:Promise.resolve({id:'id'})});
 assert.equal(untrusted.headers.get('content-disposition'),'attachment');assert.match(untrusted.headers.get('content-security-policy'),/sandbox/);
 console.log('PASS: contenido privado sin descarga para usuarios bloqueados; visor PDF por rangos y sin caché compartida.');
}finally{global.fetch=original;}})().catch(error=>{console.error(error);process.exitCode=1;});
