"use client";
import SearchableSelect from "./SearchableSelect";
import CountryFlag, { countryFlagCode, countryFlagLabel } from "./CountryFlag";
import countries from "@/app/data/paises.json";

type Props = { value: string; onChange: (country: string) => void; name?: string; id?: string; required?: boolean; disabled?: boolean; placeholder?: string; className?: string; "aria-label"?: string; flags?: "options" | "all"; countries?: string[] };
export const COUNTRY_OPTIONS = countries as string[];
export const isValidCountry = (value: string) => COUNTRY_OPTIONS.includes(value);

export default function CountrySelect({value,onChange,name,id,required,disabled,placeholder,className,"aria-label":ariaLabel,flags,countries = COUNTRY_OPTIONS}:Props) {
 const legacy = flags && value && !countries.includes(value) ? value : "";
 const legacyCode = legacy ? countryFlagCode(legacy) : undefined;
 const options = (legacy ? [legacy, ...countries.filter(country => !legacyCode || countryFlagCode(country) !== legacyCode)] : countries)
  .map(country => ({
    value: country,
    label: flags ? countryFlagLabel(country) : country,
    searchText: flags ? country : undefined,
    icon: flags && countryFlagCode(country) ? <CountryFlag country={country} /> : undefined,
  }));
 return <SearchableSelect id={id} label={ariaLabel||'País'} value={value} onChange={onChange} name={name} required={required} disabled={disabled} placeholder={placeholder} inputClassName={className} options={options} showSelectedIcon={flags === "all"} />;
}
