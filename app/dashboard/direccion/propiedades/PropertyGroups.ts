import type {Property} from './types';
const collator=new Intl.Collator('es',{numeric:true,sensitivity:'base'});
export function groupParkings(properties:Property[]){
 const groups=new Map<string,{nombre:string;plazas:Property[]}>();
 for(const property of properties.filter(p=>p.tipo==='parking')){
  const nombre=property.conjunto?.trim()||'Sin parking asignado',key=nombre.toLocaleLowerCase('es');
  if(!groups.has(key))groups.set(key,{nombre,plazas:[]});
  groups.get(key)!.plazas.push(property);
 }
 return [...groups.values()].sort((a,b)=>collator.compare(a.nombre,b.nombre)).map(group=>({...group,plazas:group.plazas.sort((a,b)=>collator.compare(a.plaza||a.identificador||a.nombre,b.plaza||b.identificador||b.nombre))}));
}
