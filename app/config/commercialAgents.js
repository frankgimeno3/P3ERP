export const commercialAgentRoles = ["base", "direccion", "administracion", "operaciones", "superadmin"];

export function isCommercialAgent(agent) {
  const role=String(agent?.rol_agente||'').trim().toLowerCase();
  return Boolean(agent&&(agent.estado_agente===undefined||agent.estado_agente==='activo')&&commercialAgentRoles.includes(role==='comercial'?'base':role));
}
