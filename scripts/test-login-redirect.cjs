/* eslint-disable @typescript-eslint/no-require-imports -- Isolated auth boundary tests. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {NextRequest}=require('next/server');
const {JSDOM}=require(path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'));
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/?next=%2Fdashboard%2Fcomercial%2Fcuentas%2FA%3Ftab%3Dcontactos%23principal'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const React=require('react'),{createRoot}=require('react-dom/client');
let rejectResponse;let role='operaciones';let databaseFailure=false;let serverSessionFailure=false;const redirects=[],router={replace:url=>redirects.push(url)};
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const mod={exports:{}};
const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
new Function('require','module','exports',js)(id=>{
 if(id==='next/navigation')return {useRouter:()=>router};
 if(id==='aws-amplify')return {Amplify:{configure(){}}};
 if(id==='aws-amplify/auth/cognito')return {};
 if(id==='@aws-amplify/core')return {};
 if(id==='aws-amplify/auth')return {};
 if(id.includes('AuthenticationService'))return {__esModule:true,default:{checkSession:async()=>null,login:async()=>({sub:'user'}),checkServerSession:async()=>{if(serverSessionFailure)throw new Error('Servidor no disponible');}}};
 if(id==='axios')return {__esModule:true,default:{create:()=>({interceptors:{request:{use(){}},response:{use(ok,reject){rejectResponse=reject;}}}})}};
 if(id.endsWith('env.js'))return {COGNITO:{CLIENT_ID:'test',REGION:'region',USER_POOL_ID:'pool'}};
 if(id.includes('pgClient'))return {getPgPool:()=>({query:async()=>{if(databaseFailure)throw Object.assign(new Error('Database unavailable'),{code:'ETIMEDOUT'});return {rows:[{rol_agente:role,id_agente:'agent'}]};}})};
 if(id==='jose')return {createRemoteJWKSet:()=>({}),jwtVerify:async token=>({payload:token==='id'?{token_use:'id',email:'test@example.test'}:{token_use:'access',client_id:'test'}})};
 if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(file),id);return load([base,base+'.js',base+'.ts',base+'.tsx'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile()));}
 return require(id);
},mod,mod.exports);cache.set(file,mod.exports);return mod.exports;}
(async()=>{
 const AuthenticationService=load('app/service/AuthenticationService.js').default;
 const originalFetch=global.fetch;
 try {
   global.fetch=async()=>({status:200,ok:true,json:async()=>({authenticated:true})});
   await AuthenticationService.checkServerSession();
   global.fetch=async()=>({status:401,ok:false});
   await assert.rejects(()=>AuthenticationService.checkServerSession(),/Cognito/);
   global.fetch=async()=>({status:503,ok:false});
   await assert.rejects(()=>AuthenticationService.checkServerSession(),/base de datos/);
   global.fetch=async()=>{throw Object.assign(new Error('Aborted'),{name:'AbortError'});};
   await assert.rejects(()=>AuthenticationService.checkServerSession(),/tardado demasiado/);
 } finally {global.fetch=originalFetch;}
 const {safeLoginTarget,loginDestination,loginUrl}=load('app/config/loginRedirect.js');
 const target='/dashboard/comercial/cuentas/A?tab=contactos#principal';
 assert.equal(loginDestination(loginUrl(target).slice(1)),target);
 for(const bad of ['https://other.test','//other.test','/\\other.test','/%2Fother.test','/','/unlogged/x','/api/v1/x','/admin','/dashboard/../','/bad%00'])assert.equal(safeLoginTarget(bad),null,bad);
 assert.equal(loginDestination('?next=https%3A%2F%2Fother.test','/dashboard/old'),'/dashboard');
 assert.equal(loginDestination('?next=%2Fdashboard%2Fnew','/dashboard/old'),'/dashboard/new');
 const {middleware}=load('middleware.js');
 const unauth=await middleware(new NextRequest('http://localhost/dashboard/comercial/cuentas/A?tab=contactos'));
 const login=new URL(unauth.headers.get('location'));assert.equal(login.pathname,'/');assert.equal(login.searchParams.get('next'),'/dashboard/comercial/cuentas/A?tab=contactos');
 assert.equal((await middleware(new NextRequest('http://localhost/api/v1/comercial/cuentas'))).status,401);
 const cookie='CognitoIdentityServiceProvider.test.LastAuthUser=user; CognitoIdentityServiceProvider.test.user.accessToken=access; CognitoIdentityServiceProvider.test.user.idToken=id';
 const authenticated=await middleware(new NextRequest('http://localhost'+loginUrl(target),{headers:{cookie}}));assert.equal(authenticated.headers.get('location'),'http://localhost'+target);
 databaseFailure=true;
 assert.equal((await middleware(new NextRequest('http://localhost/api/v1/auth/session',{headers:{cookie}}))).status,503);
 const unavailable=await middleware(new NextRequest('http://localhost/dashboard',{headers:{cookie}}));
 assert.equal(new URL(unavailable.headers.get('location')).searchParams.get('auth_error'),'service');
 const recovery=await middleware(new NextRequest(unavailable.headers.get('location'),{headers:{cookie}}));
 assert.equal(recovery.headers.get('location'),null,'Service errors must show the login error without a redirect loop');
 databaseFailure=false;
 role='superadmin';
 const oldBankPath='/dashboard/direccion/tesoreria/extractos/revision';
 const newBankPath='/dashboard/direccion/tesoreria/extractos/conciliacion';
 for(const suffix of ['', '/duplicados', '/banc_sab_26_000.000.314']) {
   const redirected=await middleware(new NextRequest('http://localhost'+oldBankPath+suffix+'?banco=Sabadell',{headers:{cookie}}));
   assert.equal(redirected.status,308);
   const url=new URL(redirected.headers.get('location'));
   assert.equal(decodeURIComponent(url.pathname),newBankPath+suffix);
   assert.equal(url.searchParams.get('banco'),'Sabadell');
   const current=await middleware(new NextRequest('http://localhost'+encodeURI(newBankPath+suffix),{headers:{cookie}}));
   assert.equal(current.headers.get('location'),null,'Canonical URLs must not redirect again');
 }
 role='operaciones';
 load('app/apiClient.js');const browser=global.window;let expiredUrl;
 global.window={location:{pathname:'/dashboard/order',search:'?x=1',hash:'#receipt',replace:url=>{expiredUrl=url;}},localStorage};
 assert.throws(()=>rejectResponse({response:{status:401,data:{message:'Expired'}}}));
 assert.equal(loginDestination(expiredUrl.slice(1)),'/dashboard/order?x=1#receipt');global.window=browser;
 localStorage.setItem('userPayload','{"sub":"expired"}');localStorage.setItem('redirectAfterLogin','/dashboard/old');
 const root=createRoot(document.getElementById('root')),Home=load('app/page.tsx').default;
 await React.act(async()=>root.render(React.createElement(Home)));assert.equal(redirects.length,0);assert.equal(localStorage.getItem('userPayload'),null);
 const browserLocation={search:browser.location.search,hash:browser.location.hash,replace:url=>redirects.push(url)};
 global.window=new Proxy(browser,{get:(value,key)=>key==='location'?browserLocation:Reflect.get(value,key)});
 serverSessionFailure=true;
 await React.act(async()=>{document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));});
 assert.equal(redirects.length,0);assert.match(document.body.textContent,/Servidor no disponible/);assert.ok(document.querySelector('form'));
 serverSessionFailure=false;
 await React.act(async()=>{document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,1900));});
 assert.equal(redirects.at(-1),target);assert.equal(localStorage.getItem('redirectAfterLogin'),null);
 global.window=browser;
 await React.act(async()=>root.unmount());dom.window.close();
 console.log('PASS: middleware return URL, authenticated return, API 401 path/query/hash, safe destinations, URL priority, stale session cache and successful login return.');
})().catch(error=>{console.error(error);process.exitCode=1;});
