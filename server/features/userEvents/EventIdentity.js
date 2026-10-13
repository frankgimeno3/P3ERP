import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';

const key=()=>{
 const secret=process.env.P3_EVENT_SIGNING_KEY||process.env.DATABASE_PASSWORD;
 if(!secret)throw Error('No hay clave del servidor para identificar los eventos.');
 return createHash('sha256').update(`p3erp:user-events:v1:${secret}`).digest();
};
export function signEventIdentity(context){
 const data=Buffer.from(JSON.stringify({...context,issued:Date.now()})).toString('base64url');
 return `${data}.${createHmac('sha256',key()).update(data).digest('base64url')}`;
}
export function verifyEventIdentity(token){
 if(!token)return null;if(token.length>12000)throw Error('Identidad del evento no válida.');
 const [data,signature,...rest]=token.split('.');if(rest.length||!signature)throw Error('Identidad del evento no válida.');
 const expected=createHmac('sha256',key()).update(data).digest();
 const actual=Buffer.from(signature,'base64url');if(actual.length!==expected.length||!timingSafeEqual(expected,actual))throw Error('Identidad del evento no válida.');
 const context=JSON.parse(Buffer.from(data,'base64url').toString());
 if(!context.actorId||!context.requestId||context.issued>Date.now()+10000||Date.now()-context.issued>3600000)throw Error('Identidad del evento caducada.');
 return context;
}
export function eventRequestIdentity(request,agent,email){
 const source=['x-vercel-forwarded-for','x-forwarded-for','x-real-ip'].find(k=>request.headers.get(k));
 const address=(source?request.headers.get(source).split(',')[0].trim():'').slice(0,255);
 const route=request.nextUrl?.pathname||new URL(request.url).pathname;
 let page=null;try{const referrer=new URL(request.headers.get('referer'));if(referrer.origin===new URL(request.url).origin)page=referrer.pathname;}catch{/* No referrer is a valid request. */}
 return {actorId:agent.id_agente,actorName:agent.nombre_completo_agente||agent.nombre_agente||email||agent.id_agente,email,role:agent.rol_agente,requestId:randomUUID(),route,page,method:request.method,ip:address||null,ipSource:source||'no_disponible',enabled:!['GET','HEAD','OPTIONS'].includes(request.method)&&!/(?:^|\/)(?:login|logout|sign-in|sign-out|validate-token)(?:\/|$)/i.test(route)};
}
