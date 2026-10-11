const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').trim().toLowerCase();
export function taskAgentIds(task){return [...new Set([...(Array.isArray(task.agentes_asociados)?task.agentes_asociados:[]),...(Array.isArray(task.agentes)?task.agentes:[]),task.agente].filter(Boolean))];}
export function inferTaskAgents(source,agents){
 const key=normalize(source);if(!key)return [];
 const candidates=agents.filter(a=>a.is_empleado_account!==false);
 const exact=candidates.filter(a=>[a.value,a.id_agente,a.label,a.nombre_completo_agente,a.nombre_agente,a.email_agente,...(a.aliases||[])].some(v=>v&&normalize(v)===key));
 if(exact.length===1)return [exact[0].value||exact[0].id_agente];
 if(exact.length>1)return [];
 const token=key.includes('@')?key.split('@')[0]:key;
 const names=candidates.filter(a=>[a.label,a.nombre_completo_agente,a.nombre_agente].some(v=>v&&normalize(v).split(' ')[0]===token));
 return names.length===1?[names[0].value||names[0].id_agente]:[];
}
