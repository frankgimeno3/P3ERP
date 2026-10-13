import {AsyncLocalStorage} from 'node:async_hooks';
import {verifyEventIdentity} from './EventIdentity.js';
const contextStorage=new AsyncLocalStorage();
const cache=new Map();
export const withUserEventContext=(context,callback)=>contextStorage.run(context,callback);
export async function getUserEventContext(){
 const explicit=contextStorage.getStore();if(explicit)return explicit;
 let token;
 try{const {headers}=await import('next/headers.js');token=(await headers()).get('x-p3-event-identity');}catch{return null;}
 if(!token)return null;
 const cached=cache.get(token);if(cached&&Date.now()-cached.issued<3600000)return cached;
 const context=verifyEventIdentity(token);
 if(cache.size>256)cache.delete(cache.keys().next().value);
 cache.set(token,context);return context;
}
