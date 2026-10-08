// Static review of JSX color combinations, including inherited and hover colors.
// Dynamic styles, CSS modules, images and gradients still need browser review.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const palette={white:[1,1,1],black:[0,0,0]};
const theme=fs.readFileSync('node_modules/tailwindcss/theme.css','utf8');
for(const match of theme.matchAll(/--color-([\w-]+): oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/g)){
 const [,name,light,chroma,hue]=match,L=+light/100,a=+chroma*Math.cos(+hue*Math.PI/180),b=+chroma*Math.sin(+hue*Math.PI/180);
 const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
 palette[name]=[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(v=>{v=Math.max(0,Math.min(1,v));return v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;});
}
const luminance=color=>color.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.[jt]sx?$/.test(file)&&!file.includes(`${path.sep}api${path.sep}`))files.push(file);}}walk('app');
let scanned=0,combinations=0;const findings=[];
for(const file of files){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,/tsx$/.test(file)?ts.ScriptKind.TSX:ts.ScriptKind.JSX),variables=new Map();
 function collect(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer)variables.set(node.name.text,node.initializer);ts.forEachChild(node,collect);}collect(source);
 function strings(node,depth=0){
  if(!node||depth>5)return [''];
  if(ts.isStringLiteralLike(node))return [node.text];
  if(ts.isJsxExpression(node)||ts.isParenthesizedExpression(node))return strings(node.expression,depth+1);
  if(ts.isIdentifier(node))return strings(variables.get(node.text),depth+1);
  if(ts.isConditionalExpression(node))return [...strings(node.whenTrue,depth+1),...strings(node.whenFalse,depth+1)];
  if(ts.isTemplateExpression(node)){let result=[node.head.text];for(const span of node.templateSpans)result=result.flatMap(prefix=>strings(span.expression,depth+1).map(value=>prefix+value+span.literal.text)).slice(0,32);return result;}
  return [''];
 }
 function color(token,prefix){const hex=token.match(new RegExp(`^${prefix}-\\[(#[a-fA-F0-9]{6})\\]$`));if(hex)return {name:hex[1],rgb:[1,3,5].map(i=>parseInt(hex[1].slice(i,i+2),16)/255),alpha:1};const match=token.match(new RegExp(`^${prefix}-([\\w-]+)(?:/(\\d+))?$`));if(!match||!palette[match[1]])return null;return {name:match[1],rgb:palette[match[1]],alpha:match[2]?Number(match[2])/100:1};}
 function apply(classes,inherited,hover){let bg=inherited.bg,fg=inherited.fg,bgName=inherited.bgName,fgName=inherited.fgName;let tokens=classes.split(/\s+/).filter(token=>!token.includes(':'));if(hover)tokens=tokens.concat(classes.split(/\s+/).filter(token=>token.startsWith('hover:')||token.startsWith('enabled:hover:')).map(token=>token.replace(/^(enabled:)?hover:/,'')));
  if(classes.includes('bg-gradient-')){const start=tokens.find(token=>token.startsWith('from-'));if(start)tokens.unshift(start.replace('from-','bg-'));}
  for(const token of tokens){const value=color(token.replace(/^!/,''),'bg');if(value){bg=value.rgb.map((v,i)=>v*value.alpha+bg[i]*(1-value.alpha));bgName=value.name;}}
  for(const token of tokens){const value=color(token.replace(/^!/,''),'text');if(value){fg=value.rgb.map((v,i)=>v*value.alpha+bg[i]*(1-value.alpha));fgName=value.name;}}
  return {bg,fg,bgName,fgName};
 }
 const defaultSurface=/app[/\\](dashboard|components)[/\\]/.test(file)?'gray-100':'white';
 function visit(node,contexts=[{bg:palette[defaultSurface],fg:palette['gray-800'],bgName:defaultSurface,fgName:'gray-800'}]){
  if(ts.isJsxElement(node)||ts.isJsxSelfClosingElement(node)){
   scanned++;const opening=ts.isJsxElement(node)?node.openingElement:node,tag=opening.tagName.getText(source),attribute=opening.attributes.properties.find(attr=>ts.isJsxAttribute(attr)&&attr.name.text==='className'),variants=attribute?strings(attribute.initializer):[''];
   const next=[];for(const inherited of contexts)for(const classes of variants){const normal=apply(classes,inherited,false);next.push(normal);const hasText=/^(input|select|textarea)$/.test(tag)||(ts.isJsxElement(node)&&node.children.some(child=>(ts.isJsxText(child)&&child.text.trim())||ts.isJsxExpression(child)));
    if(!hasText||/^(svg|path|circle|line|rect|image|img|option)$/.test(tag))continue;
    for(const [state,style] of [['normal',normal],['hover',apply(classes,inherited,true)]]){if(state==='hover'&&!classes.includes('hover:'))continue;combinations++;const ratio=contrast(style.bg,style.fg);if(ratio<4.5){const {line}=source.getLineAndCharacterOfPosition(opening.getStart(source));findings.push({file:file.replaceAll('\\','/'),line:line+1,tag,state,background:style.bgName,foreground:style.fgName,ratio:Number(ratio.toFixed(2)),classes});}}
   }
   if(ts.isJsxElement(node))for(const child of node.children)visit(child,next.slice(0,32));return;
  }
  ts.forEachChild(node,child=>visit(child,contexts));
 }
 visit(source);
 function tokens(node){
  if(ts.isStringLiteralLike(node)&&/\bbg-(?:[\w-]+|\[#[\da-f]{6}\])\b/i.test(node.text)&&/\btext-(?:white|black|\w+-\d{2,3})\b/.test(node.text)){
   let parent=node.parent,inClass=false;while(parent&&!ts.isSourceFile(parent)){if(ts.isJsxAttribute(parent)&&parent.name.text==='className'){inClass=true;break;}parent=parent.parent;}
   if(!inClass&&!/bg-[\w-]+\/\d+/.test(node.text))for(const state of ['normal','hover']){if(state==='hover'&&!node.text.includes('hover:'))continue;const style=apply(node.text,{bg:palette.white,fg:palette['gray-800'],bgName:'white',fgName:'gray-800'},state==='hover'),ratio=contrast(style.bg,style.fg);combinations++;if(ratio<4.5)findings.push({file:file.replaceAll('\\','/'),line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,tag:'class-tokens',state,background:style.bgName,foreground:style.fgName,ratio:Number(ratio.toFixed(2)),classes:node.text});}
  }
  ts.forEachChild(node,tokens);
 }tokens(source);
}
const unique=[...new Map(findings.map(finding=>[`${finding.file}:${finding.line}:${finding.state}:${finding.background}:${finding.foreground}`,finding])).values()];
const report={sourceFiles:files.length,pageRoutes:files.filter(file=>/[/\\]page\.[jt]sx?$/.test(file)).length,jsxElements:scanned,colorCombinations:combinations,findings:unique};
const output=process.argv.indexOf('--output');if(output>=0)fs.writeFileSync(process.argv[output+1],JSON.stringify(report,null,2));
console.log(JSON.stringify(process.argv.includes('--summary')?{sourceFiles:report.sourceFiles,pageRoutes:report.pageRoutes,jsxElements:scanned,colorCombinations:combinations,candidates:unique.length,files:[...new Set(unique.map(f=>f.file))]}:{...report,findings:unique.map(({file,line,state,background,foreground,ratio})=>({file,line,state,background,foreground,ratio}))},null,2));
