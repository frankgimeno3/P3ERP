'use client';
export default function ModuleTabs({label,items,value,onChange,sub=false,plain=false}:{label:string;items:{value:string;label:string}[];value:string;onChange:(value:string)=>void;sub?:boolean;plain?:boolean}){
 return <div role="tablist" aria-label={label} data-subtabs={sub||undefined} className={plain?"flex flex-wrap gap-0 border-b border-gray-200":`flex flex-wrap gap-0 rounded-t-lg border border-blue-200 px-3 pt-2 ${sub?'bg-blue-100':'bg-white'}`}>
  {items.map(item=><button key={item.value} type="button" role="tab" aria-selected={value===item.value} onClick={()=>onChange(item.value)} className={plain?`relative -mb-px cursor-pointer rounded-t-lg border px-5 py-3 font-semibold transition hover:bg-white hover:text-blue-950 ${value===item.value?'z-10 border-gray-200 border-b-white bg-white text-blue-950':'border-transparent text-slate-500'}`:`cursor-pointer rounded-t border-b-[3px] px-5 py-3 font-semibold transition hover:bg-blue-50 hover:text-blue-950 ${value===item.value?`border-blue-950 text-blue-950 ${sub?'bg-white':'bg-blue-50'}`:'border-transparent text-slate-500'}`}>{item.label}</button>)}
 </div>;
}
