export function supplierKey(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Explicit equivalences requested for the supplier register; unrelated names stay separate. */
export function canonicalSupplierName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  const key = supplierKey(name);
  if (['2checkout', '2checkout - turbosmtp'].includes(key)) return '2CHECKOUT';
  if (['adobe', 'adobe+'].includes(key)) return 'ADOBE';
  if (['aigües de barcelona', 'aigues de barcelona'].includes(key)) return 'AIGÜES DE BARCELONA';
  if (['apple', 'apple - icloud'].includes(key)) return 'APPLE';
  if (['dae laboral', 'dae gabinet laboral'].includes(key)) return 'DAE GABINET LABORAL';
  if (['pix up', 'pixup'].includes(key)) return 'PIXUP';
  if (key === 'moeve') return 'MOEVE';
  if (key === 'linkedin') return 'LINKEDIN';
  const prefixes = [
    ['adobe', 'ADOBE'], ['amazon', 'AMAZON BUSINESS'], ['banco sabadell', 'BANCO SABADELL'],
    ['bitavis', 'BITAVIS SERVEIS INFORMATICS'], ['starressa', 'STARRESA'], ['starresa', 'STARRESA'],
    ['correos', 'CORREOS'], ['edisoft', 'SOFTLINE'], ['softline', 'SOFTLINE'],
    ['endesa', 'ENDESA'], ['luis f. pazos', 'LUIS F. PAZOS'],
    ['evaristo luque', 'EVARISTO LUQUE'], ['securitas direct', 'VERISURE'],
    ['verisure', 'VERISURE'], ['thalassa', 'THALASSA'],
  ];
  return prefixes.find(([prefix]) => key.startsWith(prefix))?.[1] || name;
}
