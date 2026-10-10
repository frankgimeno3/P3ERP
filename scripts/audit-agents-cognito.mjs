import fs from 'node:fs/promises';
import env from '@next/env';
import {CognitoIdentityProviderClient,ListUsersCommand} from '@aws-sdk/client-cognito-identity-provider';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const db=getPgPool(),client=new CognitoIdentityProviderClient({region:process.env.NEXT_PUBLIC_COGNITO_REGION,maxAttempts:1});
try{
 const users=[];let token;
 do{const page=await client.send(new ListUsersCommand({UserPoolId:process.env.NEXT_PUBLIC_USER_POOL_ID,Limit:60,PaginationToken:token}),{abortSignal:AbortSignal.timeout(20000)});users.push(...(page.Users||[]));token=page.PaginationToken;}while(token);
 const emails=new Set(users.flatMap(u=>[u.Username,...(u.Attributes||[]).filter(a=>a.Name==='email').map(a=>a.Value)]).map(e=>String(e||'').trim().toLowerCase()));
 const agents=(await db.query('SELECT id_agente,nombre_completo_agente,email_agente,estado_agente FROM agentes_db ORDER BY nombre_completo_agente')).rows;
 const cloud=users.map(u=>({email:u.Attributes?.find(a=>a.Name==='email')?.Value||u.Username,name:u.Attributes?.find(a=>a.Name==='name')?.Value||'',enabled:u.Enabled}));
 const report={checkedAt:new Date().toISOString(),cognitoUsers:users.length,users:cloud,agents:agents.map(a=>({...a,group:a.id_agente.startsWith('ag_import_'),existsInCognito:!!a.email_agente&&emails.has(a.email_agente.trim().toLowerCase())}))};
 const path='C:/Users/frank/Downloads/p3erp-identificadores-20261009/agents-cognito-audit.json';
 await fs.writeFile(path,JSON.stringify(report,null,2));
 console.log(JSON.stringify({cognitoUsers:users.length,users:cloud,agents:agents.length,missing:report.agents.filter(a=>!a.existsInCognito),report:path}));
}finally{client.destroy();await db.end();}
