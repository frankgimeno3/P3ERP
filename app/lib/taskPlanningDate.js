export function taskPlanningDate(value){
 const text=String(value??'').trim();if(!text)return null;
 const parts=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text),local=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
 const [year,month,day]=parts?parts.slice(1).map(Number):local?[Number(local[3]),Number(local[2]),Number(local[1])]:[];
 const date=new Date(0);date.setUTCFullYear(year,month-1,day);
 if(!year||year>9999||date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw Object.assign(new Error('Completa una fecha válida con día, mes y año, o déjala vacía.'),{status:400});
 return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
