export const commercialAgentRoles = ["comercial", "direccion", "administracion", "operaciones", "superadmin"];

export function isCommercialAgent(agent) {
  return commercialAgentRoles.includes(String(agent?.rol_agente || "").trim().toLowerCase());
}
