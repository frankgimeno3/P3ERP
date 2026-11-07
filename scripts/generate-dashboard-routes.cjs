// Catálogo de páginas reales para evitar enlaces a carpetas sin página en el midnav.
const fs = require('node:fs'), path = require('node:path');
const routes = [];
function scan(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      const segments = path.relative('app', path.dirname(file)).split(path.sep).filter(segment => !segment.startsWith('(') && !segment.startsWith('@'));
      routes.push('/' + segments.join('/'));
    }
  }
}
scan('app');
const result = JSON.stringify([...new Set(routes)].sort(), null, 2) + '\n';
const target = 'app/config/dashboardRoutePatterns.json';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== result) throw new Error('Actualiza las rutas del midnav: node scripts/generate-dashboard-routes.cjs');
  console.log(`PASS: catálogo de ${routes.length} rutas sincronizado con las páginas reales.`);
} else {
  fs.writeFileSync(target, result);
  console.log(`Actualizadas ${routes.length} rutas del midnav.`);
}
