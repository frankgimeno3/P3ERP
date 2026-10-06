export const magazineEvents = [
  {key:'fecha_pedir_materiales',label:'Pedir materiales',color:'bg-sky-100 text-sky-950'},
  {key:'fecha_recordatorio',label:'Recordatorio de materiales',color:'bg-cyan-100 text-cyan-950'},
  {key:'deadline_materiales',label:'Deadline previsto de materiales',color:'bg-amber-100 text-amber-950'},
  {key:'deadline_real_materiales',label:'Deadline real de materiales',color:'bg-red-100 text-red-950'},
  {key:'fecha_envio_imprenta',label:'Envío a imprenta',color:'bg-violet-100 text-violet-950'},
  {key:'fecha_estimada_impresion',label:'Impresión estimada',color:'bg-purple-100 text-purple-950'},
  {key:'fecha_envio_revistas',label:'Envío de revistas',color:'bg-green-100 text-green-950'},
];
export function magazineDate(value){
  if(!value)return '';
  const text=String(value),match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)||text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match)return null;
  const [year,month,day]=text.includes('/')?[Number(match[3]),Number(match[2]),Number(match[1])]:[Number(match[1]),Number(match[2]),Number(match[3])];
  const date=new Date(Date.UTC(year,month-1,day));
  if(year<1900||year>2200||date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day)return null;
  return `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`;
}
export function magazineDateKey(value){const date=magazineDate(value);return date?date.split('/').reverse().join('-'):'';}
export function magazineMonths(today=new Date(),count=24){
  return Array.from({length:count},(_,offset)=>{
    const start=new Date(today.getFullYear(),today.getMonth()+offset,1),days=new Date(start.getFullYear(),start.getMonth()+1,0).getDate(),leading=(start.getDay()+6)%7;
    const cells=Array.from({length:Math.ceil((leading+days)/7)*7},(_,i)=>i<leading||i>=leading+days?null:i-leading+1);
    return {year:start.getFullYear(),month:start.getMonth(),title:start.toLocaleDateString('es-ES',{month:'long'})+' - '+start.getFullYear(),weeks:Array.from({length:cells.length/7},(_,i)=>cells.slice(i*7,i*7+7))};
  });
}
