import { commercialAgentRoles } from '../../../app/config/commercialAgents.js';

export async function assertCommercialAgent(db, id, previousId) {
  const agentId = String(id ?? '').trim();
  // Preserve historical assignments when editing unrelated data.
  if (!agentId || agentId === String(previousId ?? '').trim()) return;
  const { rowCount } = await db.query(
    'SELECT 1 FROM agentes_db WHERE id_agente=$1 AND lower(btrim(rol_agente)) = ANY($2::text[])',
    [agentId, commercialAgentRoles],
  );
  if (!rowCount) throw Object.assign(new Error('Selecciona un agente con rol Comercial o superior; los agentes Base no están permitidos.'), { status: 400 });
}
