import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';

env.loadEnvConfig(process.cwd());
// Los nombres de marca y el marcador «-» se conservan en todos los idiomas.
const translations = {
  nombre: [
    ['1 página interior derecha','1 right-hand interior page','1 pagina interna destra','1 página interior direita'],
    ['Banner 2 columnas','2-column banner','Banner a 2 colonne','Banner de 2 colunas'],
    ['Banner 4 columnas','4-column banner','Banner a 4 colonne','Banner de 4 colunas'],
    ['Banner básico','Basic banner','Banner base','Banner básico'],
    ['Banner en calendario','Calendar banner','Banner nel calendario','Banner no calendário'],
    ['Banner preferente','Premium banner','Banner preferenziale','Banner preferencial'],
    ['Catálogos','Catalogues','Cataloghi','Catálogos'],
    ['Dirección resaltada','Highlighted address','Indirizzo in evidenza','Endereço em destaque'],
    ['Doble página','Double-page spread','Doppia pagina','Página dupla'],
    ['Interior portada','Inside front cover','Interno di copertina','Interior da capa'],
    ['Media página','Half page','Mezza pagina','Meia página'],
    ['Newsletter personalizado','Custom newsletter','Newsletter personalizzata','Newsletter personalizada'],
    ['Página 1','Page 1','Pagina 1','Página 1'],
    ['Perfil 2 columnas','2-column company profile','Profilo aziendale a 2 colonne','Perfil empresarial de 2 colunas'],
    ['Perfil 3 columnas','3-column company profile','Profilo aziendale a 3 colonne','Perfil empresarial de 3 colunas'],
    ['Perfil 4 columnas','4-column company profile','Profilo aziendale a 4 colonne','Perfil empresarial de 4 colunas'],
    ['Perfil de Empresa Básico','Basic company profile','Profilo aziendale base','Perfil empresarial básico'],
    ['Perfil de empresa Preferente','Premium company profile','Profilo aziendale preferenziale','Perfil empresarial preferencial'],
    ['Portada','Cover','Copertina','Capa'],
    ['Preferente','Premium placement','Posizionamento preferenziale','Posicionamento preferencial'],
    ['Publirreportaje','Advertorial','Publiredazionale','Publirreportagem'],
    ['Reseña con logo','Feature with logo','Presentazione con logo','Destaque com logótipo'],
    ['suscripcion europa','Europe subscription','Abbonamento Europa','Assinatura Europa'],
    ['suscripcion nacional','National subscription','Abbonamento nazionale','Assinatura nacional'],
    ['suscripcion resto mundo','Rest of world subscription','Abbonamento resto del mondo','Assinatura resto do mundo'],
    ['Videoservicios','Service video','Video dei servizi','Vídeo de serviços'],
  ],
  medio: [
    ['CALENDARIO','Calendar','Calendario','Calendário'],
    ['Hueco arquitectura','Architectural openings','Aperture architettoniche','Vãos arquitetónicos'],
    ['Quién es Quién',"Who's Who",'Chi è chi','Quem é quem'],
    ['Revista del Vidrio','Glass Magazine','Rivista del Vetro','Revista do Vidro'],
    ['Revista Ventanas, Puertas, Cerramientos y Protección Solar','Windows, Doors, Enclosures and Sun Protection Magazine','Rivista Finestre, Porte, Chiusure e Protezione Solare','Revista Janelas, Portas, Fechamentos e Proteção Solar'],
  ],
  edicion: [
    ['América Latina','Latin America','America Latina','América Latina'],
    ['Anuario 2025','2025 Yearbook','Annuario 2025','Anuário 2025'],
    ['Edición 2025','2025 Edition','Edizione 2025','Edição 2025'],
    ['Edición América Latina','Latin America Edition','Edizione America Latina','Edição América Latina'],
    ['Edición España','Spain Edition','Edizione Spagna','Edição Espanha'],
    ['Edición Iberia','Iberia Edition','Edizione Iberia','Edição Ibéria'],
    ['Edición Portugal','Portugal Edition','Edizione Portogallo','Edição Portugal'],
    ['España, Portugal, Andorra','Spain, Portugal, Andorra','Spagna, Portogallo, Andorra','Espanha, Portugal, Andorra'],
  ],
  publicacion: [
    ['Edicion 2026','2026 Edition','Edizione 2026','Edição 2026'],
    ['Edición Ventanas, Puertas, Cerramientos y Protección Solar','Windows, Doors, Enclosures and Sun Protection Edition','Edizione Finestre, Porte, Chiusure e Protezione Solare','Edição Janelas, Portas, Fechamentos e Proteção Solar'],
    ['Edición Vidrio','Glass Edition','Edizione Vetro','Edição Vidro'],
    ['Envío x','Delivery x','Invio x','Envio x'],
    ['Número 213','Issue 213','Numero 213','Número 213'],
    ['Número 214','Issue 214','Numero 214','Número 214'],
    ['Número 89','Issue 89','Numero 89','Número 89'],
    ['Número 90','Issue 90','Numero 90','Número 90'],
    ['Publicación 1/2','Publication 1/2','Pubblicazione 1/2','Publicação 1/2'],
    ['Publicación 2/2','Publication 2/2','Pubblicazione 2/2','Publicação 2/2'],
  ],
};

const pool=getPgPool(),db=await pool.connect();
try{
  await db.query('BEGIN');
  const counts={};
  for(const [field,terms] of Object.entries(translations)){
    counts[field]=0;
    for(const [es,en,it,pt] of terms){
      const result=await db.query(`UPDATE servicios_db SET ${field}_servicio_en=$2,${field}_servicio_it=$3,${field}_servicio_pt=$4
        WHERE lower(btrim(${field}_servicio_es))=lower($1)`,[es,en,it,pt]);
      counts[field]+=result.rowCount;
    }
  }
  await db.query(`UPDATE servicios_db SET nombre_espanol=nombre_servicio_es,nombre_ingles=nombre_servicio_en,
    nombre_italiano=nombre_servicio_it,nombre_portugues=nombre_servicio_pt`);
  await db.query('COMMIT');
  console.log(counts);
}catch(error){await db.query('ROLLBACK');throw error;}
finally{db.release();await pool.end();}
