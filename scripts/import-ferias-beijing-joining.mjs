import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import XLSX from "xlsx";

const excelPath = process.argv[2];
if (!excelPath || !fs.existsSync(excelPath)) throw new Error("Indica una ruta válida al Excel.");

const env = {};
for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
}

const monthNumbers = {
  enero: 1, january: 1, febrero: 2, february: 2, marzo: 3, march: 3,
  abril: 4, april: 4, mayo: 5, may: 5, junio: 6, june: 6,
  julio: 7, july: 7, agosto: 8, august: 8, septiembre: 9, september: 9,
  octubre: 10, october: 10, noviembre: 11, november: 11, diciembre: 12, december: 12,
};
const countries = new Map(Object.entries({
  "ciudad de mexico": "México", "sao paulo": "Brasil", paris: "Francia", dusseldorf: "Alemania",
  madrid: "España", estambul: "Turquía", taskent: "Uzbekistán", "nueva delhi": "India",
  moscu: "Rusia", johannesburgo: "Sudáfrica", dubai: "Emiratos Árabes Unidos", "el cairo": "Egipto",
  birmingham: "Reino Unido", riad: "Arabia Saudí", "las vegas": "Estados Unidos", milan: "Italia",
  atlanta: "Estados Unidos", poznan: "Polonia", bangkok: "Tailandia", astana: "Kazajistán",
  bucarest: "Rumanía", dakar: "Senegal", yakarta: "Indonesia", valencia: "España", argel: "Argelia",
  teheran: "Irán", "kuala lumpur": "Malasia", guangzhou: "China", bangalore: "India",
  "ho chi minh": "Vietnam", karachi: "Pakistán", hannover: "Alemania", colonia: "Alemania",
  almaty: "Kazajistán", toronto: "Canadá", bogota: "Colombia", pordenone: "Italia",
  hanoi: "Vietnam", orlando: "Estados Unidos",
}));

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function slug(value) {
  return normalized(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55);
}
function isoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}
function parseDateRange(rawValue) {
  const raw = normalized(rawValue).replace(/[–—]/g, "-").replace(/\s+/g, " ");
  const yearMatch = raw.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  if (!year) return { year: "", start: null, end: null };
  const cross = raw.match(/^(\d{1,2})\s+([a-z]+)-(\d{1,2})\s+([a-z]+)\s+\d{4}$/);
  if (cross) return {
    year: String(year),
    start: isoDate(year, monthNumbers[cross[2]], Number(cross[1])),
    end: isoDate(year, monthNumbers[cross[4]], Number(cross[3])),
  };
  const same = raw.match(/^(\d{1,2})-(\d{1,2})\s+([a-z]+)\s+\d{4}$/);
  if (same) return {
    year: String(year),
    start: isoDate(year, monthNumbers[same[3]], Number(same[1])),
    end: isoDate(year, monthNumbers[same[3]], Number(same[2])),
  };
  return { year: String(year), start: null, end: null };
}
function legacyDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const workbook = XLSX.readFile(excelPath, { raw: false });
const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "", raw: false });
const source = "FERIAS BEIJING JOINING.xlsx";
const rows = matrix.slice(1).map((row, index) => {
  const [fecha, feria, periodicidad, ciudad, tematica] = row.map((value) => String(value || "").trim());
  const sourceRow = index + 2;
  if (!fecha || !feria || normalized(fecha) === "fecha" || !/\b20\d{2}\b/.test(fecha)) return null;
  const dates = parseDateRange(fecha);
  const digest = crypto.createHash("sha1").update(`${sourceRow}|${feria}|${fecha}|${ciudad}`).digest("hex").slice(0, 8);
  return {
    id: `fer_bj_${dates.year}_${slug(feria)}_${digest}`,
    sourceRow, fecha, feria, periodicidad, ciudad, tematica: tematica.trim(),
    pais: countries.get(normalized(ciudad)) || "",
    ...dates,
  };
}).filter(Boolean);

const pool = new pg.Pool({
  database: env.DATABASE_NAME, user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
  host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT), ssl: { rejectUnauthorized: false },
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const row of rows) {
    await client.query(`
      INSERT INTO administracion_ferias (
        id_feria,titulo_especifico_edicion,nombre_feria,pais,ciudad,edicion_numero,
        descripcion,fecha_incio,fecha_finalizacion,periodicidad,tematica,fecha_texto_original,
        fecha_inicio,fecha_fin,fuente_importacion,fuente_fila
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::date,$14::date,$15,$16)
      ON CONFLICT (fuente_importacion,fuente_fila) WHERE fuente_importacion <> '' AND fuente_fila IS NOT NULL
      DO UPDATE SET
        titulo_especifico_edicion=EXCLUDED.titulo_especifico_edicion,nombre_feria=EXCLUDED.nombre_feria,
        pais=EXCLUDED.pais,ciudad=EXCLUDED.ciudad,edicion_numero=EXCLUDED.edicion_numero,
        descripcion=EXCLUDED.descripcion,fecha_incio=EXCLUDED.fecha_incio,
        fecha_finalizacion=EXCLUDED.fecha_finalizacion,periodicidad=EXCLUDED.periodicidad,
        tematica=EXCLUDED.tematica,fecha_texto_original=EXCLUDED.fecha_texto_original,
        fecha_inicio=EXCLUDED.fecha_inicio,fecha_fin=EXCLUDED.fecha_fin,updated_at=NOW()
    `, [
      row.id, `${row.feria} ${row.year}`, row.feria, row.pais, row.ciudad, row.year,
      row.tematica, legacyDate(row.start), legacyDate(row.end), row.periodicidad, row.tematica,
      row.fecha, row.start, row.end, source, row.sourceRow,
    ]);
  }
  await client.query("COMMIT");
  console.log(JSON.stringify({ imported: rows.length, source, incompleteDates: rows.filter((row) => !row.start).length }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
