import fs from 'node:fs';

const tableCatalog = JSON.parse(fs.readFileSync('database/rds-table-catalog.json', 'utf8'));

export function readLegacyMigrationSql(file) {
  let sql = fs.readFileSync(file, 'utf8');
  for (const { old, name } of tableCatalog) {
    if (old !== name) sql = sql.replace(new RegExp(`(?<![A-Za-z0-9_])${old}(?![A-Za-z0-9_])`, 'g'), name);
  }
  return sql;
}
