"use client";

import DateInputRow from "@/app/components/DateInputRow";
export default function DatePartsInput({label,value,onChange,disabled=false,hideLabel=false,inputClassName}:{label:string;value:string;onChange:(value:string)=>void;disabled?:boolean;hideLabel?:boolean;inputClassName?:string}) {
  const parts=value.includes('-')?value.slice(0,10).split('-').reverse():value.split('/');
  const fields = <DateInputRow>{['dd','mm','yyyy'].map((part,index)=><input key={part} disabled={disabled} aria-label={`${label}: ${part}`} placeholder={part} inputMode="numeric" maxLength={index===2?4:2} value={parts[index] || ''} onChange={event=>{const next=[parts[0] || '',parts[1] || '',parts[2] || ''];next[index]=event.target.value.replace(/\D/g,'').slice(0,index===2?4:2);onChange(next.some(Boolean) ? next.join('/') : '');}} className={inputClassName || 'rounded border bg-white p-2 text-gray-900 disabled:bg-gray-100'}/>)}</DateInputRow>;
  return hideLabel ? <div role="group" aria-label={label}>{fields}</div> : <fieldset disabled={disabled} className="min-w-0"><legend className="mb-1 text-sm">{label}</legend>{fields}</fieldset>;
}
