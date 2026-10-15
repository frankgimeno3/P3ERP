'use client';
export default function ModuleTabs({label,items,value,onChange,sub=false,plain=false}:{label:string;items:{value:string;label:string}[];value:string;onChange:(value:string)=>void;sub?:boolean;plain?:boolean}){
 return <div role="tablist" aria-label={label} data-subtabs={sub||undefined} className={plain?"flex flex-wrap gap-2":`flex flex-wrap gap-0 rounded-t-lg border border-blue-200 px-3 pt-2 ${sub?'bg-blue-100':'bg-white'}`}>
  {items.map(item=><button key={item.value} type="button" role="tab" aria-selected={value===item.value} onClick={()=>onChange(item.value)} className={plain?`cursor-pointer rounded-lg px-5 py-3 font-semibold transition hover:bg-gray-100 hover:text-blue-950 ${value===item.value?'bg-white text-blue-950 shadow-sm':'text-slate-500'}`:`cursor-pointer rounded-t border-b-[3px] px-5 py-3 font-semibold transition hover:bg-blue-50 hover:text-blue-950 ${value===item.value?`border-blue-950 text-blue-950 ${sub?'bg-white':'bg-blue-50'}`:'border-transparent text-slate-500'}`}>{item.label}</button>)}
 </div>;
}
