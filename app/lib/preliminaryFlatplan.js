// Physical page index: 0 cover, 1 inside cover, 2 printed page 1.
export const flatplanPageLabel = index => flatplanMagazinePageLabel(index);
export const flatplanMagazinePageLabel = index => index === 0 ? 'Portada' : index === 1 ? 'Interior portada' : String(index - 1);
const isSpread = block => ['Anuncio','Artículo'].includes(block?.type);
export function flatplanRows(plan) {
 const totals = new Map();
 for (const id of plan.slots) if (id) totals.set(id, (totals.get(id) || 0) + 1);
 const seen = new Map();
 return plan.slots.map((id,index) => {
  const block = plan.blocks.find(b => b.id === id); const part = id ? (seen.get(id) || 0) + 1 : 0;
  if (id) seen.set(id, part);
  return {index, block, part, total:totals.get(id) || 0, label:flatplanPageLabel(index)};
 });
}
export function validateFlatplan(plan) {
 if (!Array.isArray(plan.slots) || plan.slots.length < 8 || plan.slots.length > 1000 || plan.slots.length % 2) throw Error('La revista debe tener un número par de páginas físicas, entre 8 y 1000.');
 if (plan.slots[0] !== 'cover') throw Error('La portada debe permanecer al inicio.');
 const ids=new Set(plan.blocks.map(b=>b.id));
 if(ids.size!==plan.blocks.length)throw Error('Hay bloques duplicados.');
 for(const id of plan.slots)if(id&&!ids.has(id))throw Error('Página sin contenido válido.');
 for(const block of plan.blocks) {
  const positions=plan.slots.flatMap((id,i)=>id===block.id?[i]:[]);
  if(positions.length && positions.at(-1)-positions[0]+1!==positions.length)throw Error('Un contenido no puede quedar partido.');
  if(isSpread(block)&&positions.length===2&&(positions[0]+1)%2!==0)throw Error('El contenido de dos páginas debe empezar en una página física par.');
 }
 return plan;
}
function finish(plan) {
 // An odd-sized insertion/removal may change subsequent spread parity.
 // Add a vacant left page before each displaced double advertisement.
 for(let index=1;index<plan.slots.length;index++) {
  const id=plan.slots[index];if(!id||plan.slots[index-1]===id)continue;
  const block=plan.blocks.find(b=>b.id===id);
  if(isSpread(block)&&plan.slots.filter(value=>value===id).length===2&&(index+1)%2!==0){plan.slots.splice(index,0,null);index++;}
 }
 if(plan.slots.length%2)plan.slots.push(null);
 return validateFlatplan(plan);
}
export const alignFlatplan = original => {
 const plan=structuredClone(original);
 const back=plan.blocks.find(b=>b.id==='back');
 if(back?.contentId){const id=back.contentId+':anuncios';back.id=id;back.cover=null;plan.slots=plan.slots.map(value=>value==='back'?id:value);}
 else {plan.slots=plan.slots.filter(value=>value!=='back');plan.blocks=plan.blocks.filter(b=>b.id!=='back');}
 return finish(plan);
};
function doubleDestination(block,count,target) {
 if(isSpread(block)&&count===2&&(target+1)%2!==0)throw Error('Elige una página de revista par para el inicio del contenido de dos páginas.');
}
function destination(plan,index) {
 if(!Number.isInteger(index)||index<1||index>=plan.slots.length)throw Error('Elige una página interior válida.');
 const id=plan.slots[index];
 if(id&&plan.slots[index-1]===id)throw Error('Ese destino es una parte intermedia. Elige la primera página del contenido.');
}
function cascadeEmpty(plan, start, lockedId=null) {
 let hole=start;
 while(true){
  let next=-1;
  for(let i=hole+1;i<plan.slots.length;i++){
   const id=plan.slots[i];
   if(id&&id!=='cover'&&id!==lockedId&&plan.slots.filter(v=>v===id).length===1){next=i;break;}
  }
  if(next<0)break;
  plan.slots[hole]=plan.slots[next];plan.slots[next]=null;hole=next;
 }
}
function trimEmptyTail(plan) {
 while(plan.slots.length>8&&!plan.slots.at(-1))plan.slots.pop();
}
export function mutateFlatplan(original, action) {
 const plan=structuredClone(original);validateFlatplan(plan);
 const id=String(action.blockId||''),positions=plan.slots.flatMap((value,i)=>value===id?[i]:[]);
 if(['move','remove','resize'].includes(action.type)) {
  if(!positions.length||id==='cover')throw Error('No se puede desplazar ni eliminar la portada.');
 }
 if(action.type==='swap') {
  const other=String(action.otherId||''),otherPositions=plan.slots.flatMap((value,i)=>value===other?[i]:[]);
  const eligible=value=>isSpread(plan.blocks.find(b=>b.id===value))&&value!=='cover';
  if(id===other||positions.length!==1||otherPositions.length!==1||!eligible(id)||!eligible(other))throw Error('Solo se pueden intercambiar dos anuncios o artículos distintos de una página de esta revista.');
  [plan.slots[positions[0]],plan.slots[otherPositions[0]]]=[other,id];
 }else if(action.type==='fill-hole') {
  const target=Number(action.target);destination(plan,target);
  if(!positions.length||id==='cover'||!isSpread(plan.blocks.find(b=>b.id===id)))throw Error('Elige un anuncio o artículo existente en esta revista.');
  doubleDestination(plan.blocks.find(b=>b.id===id),positions.length,target);
  if(plan.slots.slice(target,target+positions.length).length!==positions.length||plan.slots.slice(target,target+positions.length).some(Boolean))throw Error('El contenido necesita suficientes páginas libres consecutivas en ese destino.');
  for(const index of positions)plan.slots[index]=null;
  for(let i=0;i<positions.length;i++)plan.slots[target+i]=id;
  if(action.compact){for(const index of positions)if(!plan.slots[index])cascadeEmpty(plan,index,id);trimEmptyTail(plan);}
 }else if(action.type==='remove') {
  if(action.compact)plan.slots.splice(positions[0],positions.length);
  else for(const index of positions)plan.slots[index]=null;
  plan.blocks=plan.blocks.filter(b=>b.id!==id);
  plan.excluded=[...new Set([...(plan.excluded||[]),id])];
 }else if(action.type==='move') {
  const target=Number(action.target);destination(plan,target);
  doubleDestination(plan.blocks.find(b=>b.id===id),positions.length,target);
  if(positions.includes(target))throw Error('El contenido ya ocupa ese destino.');
  // Moving leaves the source vacant; destination indices stay stable for preview.
  for(const index of positions)plan.slots[index]=null;
  const run=plan.slots.slice(target,target+positions.length);
  if(run.length===positions.length&&run.every(v=>!v))plan.slots.splice(target,positions.length,...Array(positions.length).fill(id));
  else plan.slots.splice(target,0,...Array(positions.length).fill(id));
 }else if(action.type==='insert-empty') {
  const target=Number(action.target);destination(plan,target);
  plan.slots.splice(target,0,null);
 }else if(action.type==='remove-empty') {
  const target=Number(action.target);destination(plan,target);
  if(plan.slots[target])throw Error('Solo se puede retirar una página libre.');
  cascadeEmpty(plan,target);trimEmptyTail(plan);
 }else if(action.type==='add') {
  const block=action.block;const count=Number(action.count),target=Number(action.target);
  if(!block?.id||plan.blocks.some(b=>b.id===block.id)||!Number.isInteger(count)||count<1||count>100)throw Error('Contenido o número de páginas no válido.');
  destination(plan,target);doubleDestination(block,count,target);plan.blocks.push(block);
  const run=plan.slots.slice(target,target+count);
  if(run.length===count&&run.every(v=>!v))plan.slots.splice(target,count,...Array(count).fill(block.id));
  else plan.slots.splice(target,0,...Array(count).fill(block.id));
  plan.excluded=(plan.excluded||[]).filter(value=>value!==block.id);
 }else if(action.type==='resize') {
  const count=Number(action.count);if(!Number.isInteger(count)||count<1||count>100)throw Error('Indica entre 1 y 100 páginas.');
  plan.slots.splice(positions[0],positions.length,...Array(count).fill(id));
  const block=plan.blocks.find(b=>b.id===id);block.uncertain=false;block.pages=count;
 }else throw Error('Operación no válida.');
 return finish(plan);
}
export function createFlatplan(sources, minimum=8) {
 const blocks=[{id:'cover',type:'Portada',account:'',detail:'Portada',pages:1},{id:'inside',type:'Interior portada',account:'',detail:'Interior portada',pages:1},{id:'summary',type:'Sumario',account:'Redacción',detail:'Sumario',pages:1},{id:'index',type:'Índice',account:'Redacción',detail:'Índice de anunciantes',pages:1}];
 const slots=['cover','inside',null,null,'summary',null,'index',null];
 for(const source of sources) {
  if(source.cover) {const block=blocks.find(b=>b.id===source.cover);Object.assign(block,source,{id:source.cover});continue;}
  const count=source.pages;let start=2;
  while(true){while(slots.length<start+count)slots.push(null);if(!(isSpread(source)&&count===2&&(start+1)%2!==0)&&slots.slice(start,start+count).every(v=>!v))break;start++;}
  blocks.push(source);slots.splice(start,count,...Array(count).fill(source.id));
 }
 while(slots.length<Math.max(8,minimum))slots.push(null);
 return finish({slots,blocks,excluded:[]});
}
