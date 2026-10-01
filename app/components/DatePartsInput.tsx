"use client";
export default function DatePartsInput({label,value,onChange,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;disabled?:boolean}) {
  const parts=value.includes('-')?value.slice(0,10).split('-').reverse():value.split('/');
  return <fieldset disabled={disabled}><legend className="mb-1 text-sm">{label}</legend><div className="flex gap-2">{['dd','mm','yyyy'].map((part,index)=><input key={part} aria-label={`${label}: ${part}`} placeholder={part} inputMode="numeric" maxLength={index===2?4:2} value={parts[index] || ''} onChange={event=>{const next=[parts[0] || '',parts[1] || '',parts[2] || ''];next[index]=event.target.value.replace(/\D/g,'').slice(0,index===2?4:2);onChange(next.join('/'));}} className={`${index===2?'w-24':'w-16'} rounded border p-2 disabled:bg-gray-100`}/>)}</div></fieldset>;
}
