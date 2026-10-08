// Read-only inventory. Candidates require review; Next routes and test fixtures are roots.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceExtension = /\.(?:[cm]?[jt]sx?)$/;
const files = new Map();
const emptyDirectories = [];
const relative = value => path.relative(root, value).replaceAll('\\', '/');
function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  if (!entries.length) emptyDirectories.push(relative(directory));
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.set(relative(full), fs.statSync(full).size);
  }
}
for (const dir of ['app', 'server', 'scripts', 'docs', 'database', 'public']) {
  if (fs.existsSync(path.join(root, dir))) walk(path.join(root, dir));
}
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && sourceExtension.test(entry.name)) files.set(entry.name, fs.statSync(path.join(root, entry.name)).size);
}
const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css'];
function resolve(base) {
  const normalized = path.posix.normalize(base);
  for (const suffix of extensions) {
    if (files.has(normalized + suffix)) return normalized + suffix;
    if (files.has(normalized + '/index' + suffix)) return normalized + '/index' + suffix;
  }
  if (/\.jsx?$/.test(normalized)) {
    for (const suffix of ['.ts', '.tsx']) {
      const candidate = normalized.replace(/\.jsx?$/, suffix);
      if (files.has(candidate)) return candidate;
    }
  }
  return null;
}
const graph = new Map();
const runtimeGraph = new Map();
const unresolved = [];
const dynamicImports = [];
const packageImports = new Set();
for (const file of files.keys()) {
  if (!sourceExtension.test(file)) continue;
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const edges = new Set();
  const runtimeEdges = new Set();
  function importReference(value, node, typeOnly = false) {
    const base = value.startsWith('@/') ? value.slice(2) : value.startsWith('.') ? path.posix.join(path.posix.dirname(file), value) : null;
    if (base !== null) {
      const target = resolve(base);
      if (target) { edges.add(target); if(!typeOnly)runtimeEdges.add(target); }
      else unresolved.push({ file, line: tree.getLineAndCharacterOfPosition(node.pos).line + 1, import: value });
    } else if (!value.startsWith('node:')) packageImports.add(value.startsWith('@') ? value.split('/').slice(0, 2).join('/') : value.split('/')[0]);
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const bindings=ts.isImportDeclaration(node)?node.importClause?.namedBindings:node.exportClause;
      const typeOnly=node.isTypeOnly||node.importClause?.isTypeOnly||(!node.importClause?.name&&bindings?.elements?.length&&bindings.elements.every(element=>element.isTypeOnly));
      importReference(node.moduleSpecifier.text,node,Boolean(typeOnly));
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(tree) === 'require')) {
      if (node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) importReference(node.arguments[0].text, node);
      else dynamicImports.push({ file, line: tree.getLineAndCharacterOfPosition(node.pos).line + 1 });
    }
    // Covers fs.readFileSync/path.resolve fixtures and URL-addressed public assets.
    if (ts.isStringLiteralLike(node)) {
      const literal = node.text.replaceAll('\\', '/');
      if (/^(app|server|scripts|database|docs|public)\//.test(literal)) {
        const target = resolve(literal);
        if (target) edges.add(target);
      }
      if (literal.startsWith('/') && files.has('public' + literal)) edges.add('public' + literal);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  graph.set(file, edges);
  runtimeGraph.set(file,runtimeEdges);
}
const convention = /^(page|layout|route|loading|error|global-error|not-found|global-not-found|default|template|sitemap|robots|manifest|icon|apple-icon|opengraph-image|twitter-image|forbidden|unauthorized)\.[^.]+$/;
const roots = [...graph.keys()].filter(file => !file.includes('/') || file.startsWith('scripts/') || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || (file.startsWith('app/') && convention.test(path.posix.basename(file))));
const reachable = new Set();
function mark(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const target of graph.get(file) || []) mark(target);
}
roots.forEach(mark);
const candidates = [...graph.keys()].filter(file => !reachable.has(file) && !file.endsWith('.d.ts')).sort();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
// Strongly connected import groups; this is structural evidence, not proof of a runtime fault.
const indices=new Map(),low=new Map(),stack=[],active=new Set(),cycles=[];
let nextIndex=0;
function connect(file){
  indices.set(file,nextIndex);low.set(file,nextIndex++);stack.push(file);active.add(file);
  for(const target of runtimeGraph.get(file)||[]){
    if(!runtimeGraph.has(target))continue;
    if(!indices.has(target)){connect(target);low.set(file,Math.min(low.get(file),low.get(target)));}
    else if(active.has(target))low.set(file,Math.min(low.get(file),indices.get(target)));
  }
  if(low.get(file)!==indices.get(file))return;
  const group=[];let current;
  do{current=stack.pop();active.delete(current);group.push(current);}while(current!==file);
  if(group.length>1||runtimeGraph.get(file)?.has(file))cycles.push(group.sort());
}
for(const file of graph.keys())if(!indices.has(file))connect(file);
const report = {
  scannedSourceFiles: graph.size,
  candidateFiles: candidates.length,
  candidateBytes: candidates.reduce((total, file) => total + files.get(file), 0),
  candidates,
  emptyDirectories,
  unresolvedImports: unresolved,
  dynamicImports,
  circularImportGroups: cycles,
  dependenciesWithoutLiteralImports: Object.keys(manifest.dependencies || {}).filter(name => !packageImports.has(name)),
};
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`${report.scannedSourceFiles} source files; ${report.candidateFiles} unreachable candidates (${Math.round(report.candidateBytes / 1024)} KiB).`);
  for (const file of candidates) console.log('CANDIDATE ' + file);
  for (const dir of emptyDirectories) console.log('EMPTY ' + dir);
  for (const item of unresolved) console.log('UNRESOLVED ' + JSON.stringify(item));
  console.log(`${dynamicImports.length} computed imports require manual review; use --json for details.`);
  console.log(`${cycles.length} circular import groups; use --json for details.`);
  console.log('Dependencies without literal imports (not proof of disuse): ' + report.dependenciesWithoutLiteralImports.join(', '));
}
