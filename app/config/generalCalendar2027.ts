// Calendario laboral 2027 facilitado por el equipo. Las líneas sin recuadro
// de día representan una ventana, no una fecha de publicación confirmada.
type Entry = [name: string, from: string, through?: string];
export const fairs2027: Entry[] = [
  ['BAU', '01-11', '01-15'], ['R+T', '02-15', '02-19'],
  ['REBUILD', '03-16', '03-18'], ['SICON', '04-20', '04-22'],
  ['CONSTRUMAT', '05-18', '05-20'], ['CHINA GLASS', '05-24', '05-27'],
  ['GLASSTECH MEXICO', '07-07', '07-09'], ['WINDOWS AND DOORS MEXICO', '07-07', '07-09'],
  ['GLASS S. AMERICA', '09-08', '09-11'], ['CONGRESO ASEFAVE', '10-21', '10-22'],
  ['GLASSBUILD AMERICA', '10-26', '10-28'], ['VITRUM', '11-16', '11-19'],
  ['MADE EXPO', '11-17', '11-20'],
];
const editorial: Entry[] = [
  ['Pedir materiales 220 y 94', '2026-12-01', '2026-12-31'],
  ['Fecha límite 220 y 94', '01-11'], ['Envío a imprenta 220', '01-29'],
  ['Publicación 220', '02-01', '02-07'], ['Publicación 94', '02-15', '02-21'],
  ['Insistir materiales Hueco 1', '02-22', '02-28'], ['Fecha límite Hueco 1', '03-08'],
  ['Publicación Hueco 1', '03-22', '03-25'], ['Insistir materiales 221 y 95', '03-29', '04-04'],
  ['Fecha límite 221 y 95', '04-12'], ['Envío a imprenta 221', '04-30'],
  ['Publicación 221', '05-03', '05-09'], ['Publicación 95', '05-10', '05-16'],
  ['Insistir materiales 222 y 96', '05-17', '05-23'], ['Fecha límite 222 y 96', '05-31'],
  ['Envío a imprenta 222', '06-18'], ['Publicación 222', '06-21', '06-27'],
  ['Insistir materiales 223 y 97', '06-21', '06-27'], ['Publicación 96', '07-01', '07-04'],
  ['Fecha límite 223 y 97', '07-12'], ['Envío a imprenta 223', '07-30'],
  ['Insistir materiales 224 y 98', '08-30', '08-31'], ['Publicación 223', '09-01', '09-05'],
  ['Publicación 97', '09-13', '09-19'], ['Fecha límite QQ 2027 y Hueco 2', '09-20'],
  ['Publicación Hueco 2', '09-27', '09-30'], ['Insistir materiales 224 y 98', '09-27', '09-30'],
  ['Publicación QQ Digital 2027', '10-04', '10-10'], ['Fecha límite 224 y 98', '10-11'],
  ['Envío a imprenta 224', '10-29'], ['Publicación 224', '11-01', '11-07'],
  ['Publicación 98', '11-08', '11-14'], ['Insistir materiales 225 y 99', '11-08', '11-14'],
  ['Fecha límite 225 y 99', '11-22'], ['Envío a imprenta 225', '12-03'],
  ['Publicación 225', '12-13', '12-19'], ['Publicación 99', '12-20', '12-26'],
];
const labor: Entry[] = [
  ...['01-01', '01-06', '03-26', '05-01', '10-12', '11-01', '12-06', '12-08', '12-25'].map((day): Entry => ['Festivo España', day]),
  ...['03-29', '06-24', '09-11', '12-26'].map((day): Entry => ['Festivo Cataluña', day]),
  ...['05-17', '09-24'].map((day): Entry => ['Festivo Barcelona', day]),
  ...['12-24', '12-31'].map((day): Entry => ['Festivo de convenio', day]),
  ...[['01-04','01-05'],['06-25'],['08-02','08-06'],['08-09','08-13'],['08-16','08-20'],['08-23','08-27'],['12-07']]
    .map(([from, through]): Entry => ['Vacaciones de empresa', from, through]),
];
const fullDate = (day: string) => day.length === 5 ? `2027-${day}` : day;
export const generalCalendarEvents = [['Feria', fairs2027], ['Editorial', editorial], ['Laboral', labor]]
  .flatMap(([type, entries]) => (entries as Entry[]).map(([nombre, from, through], index) => ({
    id: `${type}-${index}`, nombre, estado: '', category: type as string,
    fecha_inicio: fullDate(from), fecha_fin: fullDate(through ?? from),
  })));
