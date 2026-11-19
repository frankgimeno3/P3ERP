import flagCodes from "@/app/lib/countryFlagCodes.json";

const codes = flagCodes.split(" ");
const spanishNames = new Intl.DisplayNames("es", { type: "region", fallback: "none" });
const englishNames = new Intl.DisplayNames("en", { type: "region", fallback: "none" });

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

const byName = new Map<string, string>();
for (const code of codes) {
  for (const names of [spanishNames, englishNames]) {
    const name = names.of(code);
    if (name) byName.set(normalize(name), code);
  }
}
for (const [name, code] of Object.entries({
  "Arabia Saudita": "SA",
  "República Checa": "CZ",
  "EE. UU.": "US",
  "Côte d'Ivoire": "CI",
})) {
  byName.set(normalize(name), code);
}

export function countryFlagCode(country: string) {
  const code = country.trim().toUpperCase();
  if (code === "UK") return "GB";
  return codes.includes(code) ? code : byName.get(normalize(country));
}

export function countryFlagLabel(country: string) {
  const code = countryFlagCode(country);
  return code ? spanishNames.of(code) ?? country : country;
}

export default function CountryFlag({ country, className = "h-4 w-4 shrink-0" }: { country: string; className?: string }) {
  const code = countryFlagCode(country);
  if (!code) return null;
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 512 512" className={className}>
      <use href={`/country-flags.svg#${code.toLowerCase()}`} />
    </svg>
  );
}
