const columns = {
  nombre_empresa: 'nombre_empresa',
  id_cuenta: 'id_cuenta',
  id_edisoft: 'id_edisoft',
  id_agente: "COALESCE((SELECT a.nombre_completo_agente FROM agentes_db a WHERE a.id_agente = comercial_cuentas.id_agente), id_agente)",
  pais_cuenta: 'pais_cuenta',
  correo_principal: 'correo_principal',
  telefono: "datos_comerciales->>'telefono_principal_cuenta'",
};

export function cuentaOrderBy(column, direction) {
  if (!Object.hasOwn(columns, column)) return 'created_at DESC, id_cuenta ASC';
  const order = direction === 'desc' ? 'DESC' : 'ASC';
  return `${columns[column]} ${order} NULLS LAST${column === 'id_cuenta' ? '' : ', id_cuenta ASC'}`;
}
