import pg from 'pg';
import {getUserEventContext} from '../features/userEvents/EventContext.js';

// Both pg Pool and Sequelize use this client. The session variable is LOCAL:
// commit/rollback clear it before a connection can return to the pool.
export class AuditedClient extends pg.Client {
 query(...args){
  const callback=typeof args.at(-1)==='function'?args.pop():null;
  const context=getUserEventContext();
  const run=()=>this.runAuditedQuery(args,context);
  const pending=(this.eventQueryQueue||Promise.resolve()).then(run,run);
  this.eventQueryQueue=pending;
  if(callback){pending.then(result=>callback(null,result),error=>callback(error));return;}
  return pending;
 }
 async runAuditedQuery(args,pendingContext){
  const context=await pendingContext;
  const sql=typeof args[0]==='string'?args[0]:args[0]?.text||'';
  const command=sql.replace(/^\s*(?:--[^\n]*\n|\/\*[\s\S]*?\*\/)\s*/g,'').trim();
  const begin=/^(?:BEGIN|START TRANSACTION)(?:\s+(?:ISOLATION LEVEL (?:READ COMMITTED|SERIALIZABLE|REPEATABLE READ)|READ (?:ONLY|WRITE)))?\s*;?$/i.test(command);
  const end=/^(?:COMMIT|END|ROLLBACK)\s*;?$/i.test(command);
  if(context?.enabled&&/;\s*(?:BEGIN|START TRANSACTION|COMMIT|END|ROLLBACK)\b/i.test(command))throw Error('Los controles de transacción auditada deben ejecutarse por separado.');
  const raw=(...a)=>super.query(...a);
  const refreshCoverage=async()=>{
   if(/\bCREATE\s+(?:UNLOGGED\s+)?TABLE\b/i.test(command)&&!command.includes('p3_install_user_event_triggers')){
    const configured=await raw("SELECT to_regprocedure('public.p3_install_user_event_triggers()') installed");
    if(configured.rows[0]?.installed)await raw('SELECT public.p3_install_user_event_triggers()');
   }
  };
  const identify=()=>raw("SELECT set_config('p3.user_event_context',$1,true)",[JSON.stringify(context)]);
  const summarize=async()=>{
   if(!context?.enabled||['GET','HEAD','OPTIONS'].includes(context.method)||/\/propuestas(?:\/|$)/.test(context.route||''))return;
   const installed=await raw("SELECT to_regprocedure('public.p3_account_operation_comment()') installed");
   if(installed.rows[0]?.installed)await raw('SELECT public.p3_account_operation_comment()');
  };
  if(/^(?:ROLLBACK\s+TO\b|SAVEPOINT\b|RELEASE\s+(?:SAVEPOINT\s+)?)/i.test(command))return raw(...args);
  if(begin){const result=await raw(...args);this.eventInTransaction=true;if(context?.enabled)await identify();return result;}
  if(end){try{if(!/^ROLLBACK/i.test(command)){if(context?.enabled)await identify();await summarize();}return await raw(...args);}finally{this.eventInTransaction=false;}}
  if(!context?.enabled){if(this.eventInTransaction)await raw("SELECT set_config('p3.user_event_context','',true)");const result=await raw(...args);await refreshCoverage();return result;}
  if(this.eventInTransaction){await identify();const result=await raw(...args);await refreshCoverage();return result;}
  // Autocommit mutations and their events share a transaction. Reads only set
  // context when invoked inside a mutating request; the trigger records no SELECT.
  await raw('BEGIN');
  try{await identify();const result=await raw(...args);await refreshCoverage();await summarize();await raw('COMMIT');return result;}
  catch(error){await raw('ROLLBACK');throw error;}
 }
}
