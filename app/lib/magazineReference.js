export function findMagazineIssue(rows,id) {
 return rows.find(row=>row.id_publicacion===id||row.id_revista===id||row.ids_publicaciones?.includes(id)||row.ids_revistas?.includes(id));
}
