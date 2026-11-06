import {getPgPool} from '../../database/pgClient.js';
export async function resolveMagazineIssueId(id,db=getPgPool()) {
 return (await db.query('SELECT p3_magazine_issue_id($1) AS id',[id])).rows[0]?.id||null;
}
export function groupMagazineIssues(rows) {
 const grouped=new Map();
 for(const row of rows){
  const id=row.id_numero_revista||row.id_revista;
  if(!grouped.has(id))grouped.set(id,{...row,id_revista:id,version_publicacion:'',impresa_o_digital:'',ids_revistas:[],ids_publicaciones:[]});
  const issue=grouped.get(id);
  for(const alias of [row.id_revista,...(row.ids_revistas||[])])if(alias&&!issue.ids_revistas.includes(alias))issue.ids_revistas.push(alias);
  if(row.id_publicacion&&!issue.ids_publicaciones.includes(row.id_publicacion))issue.ids_publicaciones.push(row.id_publicacion);
 }
 return [...grouped.values()];
}
