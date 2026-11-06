const clean = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export const productionMagazineFamilies = [
  ['vidrio-espana', 'VIDRIO ESPAÑA'],
  ['ventanas-espana', 'VENTANAS ESPAÑA'],
  ['vidrio-latam', 'VIDRIO LATAM'],
  ['ventanas-latam', 'VENTANAS LATAM'],
  ['qq-vidrio', 'QQ VIDRIO'],
  ['qq-ventanas', 'QQ VENTANAS'],
  ['hueco', 'HUECO'],
];

export function productionMagazineSector(row) {
  const title = clean(row.revista);
  const name = /quien es quien/.test(title) ? clean(row.edicion) : title;
  return name.includes('vidrio') ? 'Vidrio' : name.includes('ventana') ? 'Ventanas' : name.includes('hueco') ? 'Hueco' : 'Otro';
}

export function productionMagazineFamily(row) {
  const title = clean(row.revista), edition = clean(row.edicion);
  if (title.includes('hueco')) return 'hueco';
  const sector = productionMagazineSector(row).toLowerCase();
  if (!['vidrio', 'ventanas'].includes(sector)) return '';
  if (/quien es quien/.test(title)) return `qq-${sector}`;
  if (/america|latam/.test(edition)) return `${sector}-latam`;
  if (/iberia|espana/.test(edition)) return `${sector}-espana`;
  return '';
}
