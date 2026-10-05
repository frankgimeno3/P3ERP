import fs from 'node:fs';
import cp from 'node:child_process';
import ts from 'typescript';

const files = cp.execFileSync('rg', ['--files', 'app', '-g', '*.tsx', '-g', '*.jsx', '-g', '*.js'], {encoding: 'utf8'}).trim().split(/\r?\n/);
let inspectedTables = 0;
let exceptions = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (!/<table|[Ff]iltro|[Ff]ilter/.test(source)) continue;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const controls = [];
  let tables = 0;
  const tag = node => ts.isJsxElement(node) ? node.openingElement.tagName.getText(ast) : ts.isJsxSelfClosingElement(node) ? node.tagName.getText(ast) : '';
  function visit(node, grouped = false) {
    const name = tag(node);
    if (name === 'table') tables++;
    grouped ||= name === 'TableFilters';
    if (['input', 'select', 'textarea'].includes(name) && !grouped) {
      const attributes = ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
      const value = attributes.properties.find(prop => prop.name?.getText(ast) === 'value');
      const hint = attributes.properties.find(prop => ['placeholder', 'aria-label'].includes(prop.name?.getText(ast)));
      const binding = value?.initializer?.getText(ast) || '';
      if (process.argv.includes('--all-controls') || /filter|filtro|query|searchTerm|selectedField/i.test(binding) || /[Ff]iltrar|[Bb]uscar/.test(hint?.getText(ast) || '')) {
        controls.push({line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, binding});
      }
    }
    ts.forEachChild(node, child => visit(child, grouped));
  }
  visit(ast);
  inspectedTables += tables;
  if (controls.length && tables) {
    exceptions += controls.length;
    console.log(JSON.stringify({file, tables, controls}));
  }
}
console.log(JSON.stringify({inspectedTables, ungroupedFilterCandidates: exceptions}));
if (exceptions && !process.argv.includes('--all-controls')) process.exitCode = 1;
