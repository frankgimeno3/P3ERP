export function contentServiceGroup(row) {
 if (row.id_medio) return row.id_medio;
 const text=[row.tipo_revista_servicio,row.nombre_servicio,row.servicio,row.tipo_contenido].filter(Boolean).join(' ').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 if (/revista|hueco arquitectura|quien es quien/.test(text)) return 'revista';
 if (/suscrip/.test(text)) return 'suscripcion';
 if (/personaliz|email marketing|emailing/.test(text)) return 'newsletter_personalizado';
 if (/news/.test(text)) return 'vidrioperfil_newsletter';
 if (/banner|baner|web|portal|vidrioperfil/.test(text)) return 'vidrioperfil_portal';
 return 'otros';
}
