// Publication selections are authoritative; legacy catalog descriptions can
// belong to a different magazine or year and must not overwrite them.
export function proposalServicePatch(service, selection = {}, publication = {}, language = 'es') {
  const field = name => service?.[`${name}_servicio_${language}`] || service?.[`${name}_servicio_es`] || '';
  const magazine = Boolean(selection.id_publicacion);
  const medium = magazine ? selection.medio_publicacion || publication.medio_publicacion || publication.revista || field('medio') : field('medio');
  const edition = magazine ? selection.edicion_publicacion || publication.edicion_publicacion || publication.edicion || '' : field('edicion');
  const detail = magazine ? selection.detalle_publicacion || publication.detalle_publicacion || publication.numero_publicacion || '' : field('publicacion');
  const description = [edition, String(detail).replace(/\s*·\s*/g, ' - ')].filter(Boolean).join(' - ');
  const name = field('nombre');
  const price = Number(service?.precio_tarifa ?? service?.precio_servicio) || 0;
  return {
    id_servicio: service?.id_servicio || '', grupo_servicio: service?.id_medio || '',
    medio: medium, producto: magazine ? medium : name,
    publicacion: description, descripcion_linea: description, especificaciones_linea: name,
    precio_tarifa: price, precio_unitario: price, servicio_personalizado: false,
    deadline_publicacion: magazine ? publication.deadline_materiales || publication.deadline_publicacion || '' : service?.fecha_deadline_servicio || '',
    fecha_publicacion_publicacion: magazine ? publication.fecha_publicacion || '' : service?.fecha_publicacion_servicio || '',
  };
}
