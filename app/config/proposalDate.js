export function proposalDate(value) {
  const text=String(value || '').slice(0,10);
  const local=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text),iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if(!local&&!iso)return null;
  const [day,month,year]=local?[+local[1],+local[2],+local[3]]:[+iso[3],+iso[2],+iso[1]];
  const date=new Date(Date.UTC(year,month-1,day));
  return year>=1900&&date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date.getTime():null;
}
