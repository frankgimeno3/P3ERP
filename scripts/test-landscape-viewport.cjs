const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const React = require('react');
const { createRoot } = require('react-dom/client');

function load(file, aliases = {}) {
  const m = new Module(file, module);
  m.filename = file; m.paths = module.paths;
  const original = m.require.bind(m);
  m.require = name => aliases[name] || original(name);
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, file);
  return m.exports;
}
const geometry = load('app/lib/landscapeViewport.ts');
for (const [width, height, coarse] of [[360,800,true],[390,844,true],[768,1024,true],[1024,1366,true],[800,360,true],[1366,1024,true],[1024,768,false]]) {
  const v = geometry.getLandscapeViewport(width, height, coarse);
  assert(v && v.scale <= 1 && v.width >= 1280);
  assert(Math.abs(v.width * v.scale - (v.rotated ? height : width)) < 1e-8);
  assert(Math.abs(v.height * v.scale - (v.rotated ? width : height)) < 1e-8);
  // A menu's trigger must map back to its original logical coordinates after scaling/rotation.
  const [x,y,w,h] = [100,80,240,36], s=v.scale;
  const screen = v.rotated ? {left:width-(y+h)*s,right:width-y*s,top:x*s,bottom:(x+w)*s,width:h*s,height:w*s}
    : {left:x*s,right:(x+w)*s,top:y*s,bottom:(y+h)*s,width:w*s,height:h*s};
  const result = geometry.getCanvasRect(screen,v);
  for (const [key,expected] of Object.entries({left:x,top:y,bottom:y+h,width:w})) assert(Math.abs(result[key]-expected)<1e-8);
}
assert.equal(geometry.getLandscapeViewport(1440,900,false),null);
assert.equal(geometry.getLandscapeViewport(1920,1080,false),null);
assert.equal(geometry.getLandscapeViewport(0,800,true),null);

const dom = new JSDOM('<html><body><div id="test"></div><input id="field"></body></html>', {url:'https://example.test'});
global.window=dom.window; global.document=dom.window.document; global.HTMLElement=dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT=true;
let width=390, height=844;
Object.defineProperty(document.documentElement,'clientWidth',{get:()=>width});
Object.defineProperty(window,'innerHeight',{get:()=>height});
window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
const Viewport=load('app/components/LandscapeViewport.tsx',{'@/app/lib/landscapeViewport':geometry}).default;
const root=createRoot(document.getElementById('test'));
React.act(()=>root.render(React.createElement(Viewport)));
assert.equal(document.documentElement.dataset.landscapeViewport,'true');
assert.equal(geometry.getAppliedLandscapeViewport().rotated,true);
const transform=document.documentElement.style.getPropertyValue('--p3-viewport-transform');
document.getElementById('field').focus(); height=400;
React.act(()=>window.dispatchEvent(new window.Event('resize')));
assert.equal(document.documentElement.style.getPropertyValue('--p3-viewport-transform'),transform,'Keyboard must not rotate the form');
document.getElementById('field').blur(); width=844;height=390;
React.act(()=>window.dispatchEvent(new window.Event('resize')));
assert.equal(geometry.getAppliedLandscapeViewport().rotated,false);
React.act(()=>root.unmount());
assert.equal(document.documentElement.dataset.landscapeViewport,undefined);
assert.equal(geometry.getAppliedLandscapeViewport(),null);
assert.equal(document.documentElement.style.getPropertyValue('--p3-viewport-transform'),'');
console.log('Landscape viewport: fit, rotation, portal coordinates, keyboard and cleanup OK');
