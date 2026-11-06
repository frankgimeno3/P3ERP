'use client';
export default function ContentMaterialActions({onUpload}:{onUpload:(finished:boolean)=>void}) {
 const button='cursor-pointer rounded border px-3 py-2 text-xs transition hover:bg-blue-100';
 return <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>onUpload(false)} className={button}>Aportar material</button><button type="button" onClick={()=>onUpload(true)} className={button}>Subir versión</button></div>;
}
