// Se comparte entre las listas y la selección contratada para mantener el mismo destino.
export const editorialContentExpression = 'EXISTS(SELECT 1 FROM produccion_articulos_contenidos e WHERE e.id_contenido=c.id_contenido)';
export const magazineContentExpression = `(COALESCE(c.destino_revista,false) OR s.id_medio='revista'
 OR (NULLIF(s.id_medio,'') IS NULL AND COALESCE(s.nombre_servicio_es,'') ~* '(revista|hueco arquitectura|qui.n es qui.n)')
 OR EXISTS(SELECT 1 FROM produccion_revistas_contenidos rc WHERE rc.id_contenido=c.id_contenido)
 OR EXISTS(SELECT 1 FROM produccion_articulos_contenidos e WHERE e.id_contenido=c.id_contenido AND (COALESCE(e.revista,'') NOT IN ('','No Aplica') OR COALESCE(e.espana_previsto_numero,'')<>'' OR COALESCE(e.latam_previsto_numero,'')<>'' OR COALESCE(e.especial_numero,'')<>'' OR COALESCE(e.hueco_previsto,'')<>''))
 OR EXISTS(SELECT 1 FROM servicios_publicaciones p WHERE p.revista_id IS NOT NULL AND p.revista_id<>'' AND p.id_publicacion IN (c.id_publicacion,c.contenido_especifico_id))
 OR COALESCE(c.publicacion_num_web,'') ~* '(VIDRIO|VENTANAS|VPCS|QQ|QUI.N ES QUI.N|HUECO).*(ESPA.A|IBERIA|LATAM|AM.RICA|N[ºO°]|[0-9]$)'
 OR COALESCE(c.tipo_revista_servicio,'') ~* '(revista|hueco arquitectura|qui.n es qui.n)')`;
