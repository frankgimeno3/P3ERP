import {getPgPool} from '../../database/pgClient.js';

/**
 * @typedef {{name:string,type:string,nullable:boolean,defaultValue:string|null,primary:boolean,references:string[],description:string|null}} RdsColumn
 * @typedef {{name:string,kind:'table'|'view'|'materializedView',description:string,columns:RdsColumn[]}} RdsRelation
 */
/** @returns {Promise<RdsRelation[]>} */
export async function getRdsSchema(catalog=[],columnCatalog={},db=getPgPool()) {
  const {rows}=await db.query(`
    SELECT cls.relname AS table_name,cls.relkind AS relation_kind,
      obj_description(cls.oid,'pg_class') AS table_description,
      att.attname AS column_name,format_type(att.atttypid,att.atttypmod) AS column_type,
      NOT att.attnotnull AS nullable,pg_get_expr(def.adbin,def.adrelid) AS default_value,
      col_description(cls.oid,att.attnum) AS column_description,
      EXISTS(SELECT 1 FROM pg_constraint con WHERE con.conrelid=cls.oid AND con.contype='p' AND att.attnum=ANY(con.conkey)) AS is_primary,
      ARRAY(SELECT target_ns.nspname||'.'||target.relname||'.'||target_att.attname
        FROM pg_constraint con
        JOIN LATERAL unnest(con.conkey,con.confkey) AS key_pair(source_num,target_num) ON true
        JOIN pg_class target ON target.oid=con.confrelid
        JOIN pg_namespace target_ns ON target_ns.oid=target.relnamespace
        JOIN pg_attribute target_att ON target_att.attrelid=target.oid AND target_att.attnum=key_pair.target_num
        WHERE con.conrelid=cls.oid AND con.contype='f' AND key_pair.source_num=att.attnum
        ORDER BY target_ns.nspname,target.relname,target_att.attname) AS references
    FROM pg_class cls
    JOIN pg_namespace ns ON ns.oid=cls.relnamespace
    JOIN pg_attribute att ON att.attrelid=cls.oid AND att.attnum>0 AND NOT att.attisdropped
    LEFT JOIN pg_attrdef def ON def.adrelid=cls.oid AND def.adnum=att.attnum
    WHERE ns.nspname='public' AND cls.relkind IN ('r','p','v','m')
    ORDER BY cls.relname,att.attnum
  `);
  const descriptions=new Map(catalog.map(table=>[table.name,table.description]));
  const common={created_at:'Fecha de creación del registro.',updated_at:'Fecha de la última actualización.'};
  const relations=new Map();
  for(const row of rows){
    if(!relations.has(row.table_name))relations.set(row.table_name,{
      name:row.table_name,
      kind:row.relation_kind==='v'?'view':row.relation_kind==='m'?'materializedView':'table',
      description:descriptions.get(row.table_name)||row.table_description||'Sin descripción funcional.',
      columns:[],
    });
    relations.get(row.table_name).columns.push({
      name:row.column_name,type:row.column_type,nullable:row.nullable,defaultValue:row.default_value,
      primary:row.is_primary,references:row.references||[],
      description:row.column_description||columnCatalog[row.table_name]?.[row.column_name]||common[row.column_name]||null,
    });
  }
  return [...relations.values()];
}
