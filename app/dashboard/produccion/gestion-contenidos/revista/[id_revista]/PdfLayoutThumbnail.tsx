'use client';
import {useEffect,useRef,useState} from 'react';
export default function PdfLayoutThumbnail({material,page,loadPdf,large=false}:{material:string;page:number;loadPdf:(id:string)=>Promise<any>;large?:boolean}) {
  const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const [visible,setVisible]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'250px'});
    if(root.current)observer.observe(root.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if(!visible)return;let active=true,task:any;setError('');
    void loadPdf(material).then(async document=>{
      const pdfPage=await document.getPage(page);if(!active||!canvas.current)return;
      const base=pdfPage.getViewport({scale:1}),scale=Math.min((large?700:150)/base.width,(large?780:178)/base.height),viewport=pdfPage.getViewport({scale:scale*1.5});
      canvas.current.width=viewport.width;canvas.current.height=viewport.height;
      const context=canvas.current.getContext('2d');if(!context)return;
      task=pdfPage.render({canvasContext:context,viewport});await task.promise;
    }).catch(reason=>{if(active&&reason?.name!=='RenderingCancelledException')setError('Vista previa no disponible');});
    return()=>{active=false;task?.cancel();};
  },[visible,material,page,loadPdf,large]);
  return <div ref={root} className={`flex items-center justify-center overflow-hidden bg-slate-50 ${large?'h-[65vh]':'h-[178px]'}`}>{error?<span className="p-2 text-xs text-slate-500">{error}</span>:<canvas ref={canvas} aria-label={`Vista previa del PDF, página ${page}`} className="max-h-full max-w-full object-contain"/>}</div>;
}
