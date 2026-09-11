"use client";
import SearchableSelect from "./SearchableSelect";
import countries from "@/app/data/paises.json";

type Props = { value: string; onChange: (country: string) => void; name?: string; id?: string; required?: boolean; disabled?: boolean; placeholder?: string; className?: string; "aria-label"?: string };
export const COUNTRY_OPTIONS = countries as string[];
export const isValidCountry = (value: string) => COUNTRY_OPTIONS.includes(value);

export default function CountrySelect({value,onChange,name,id,required,disabled,placeholder,className,"aria-label":ariaLabel}:Props) {
 return <SearchableSelect id={id} label={ariaLabel||'País'} value={value} onChange={onChange} name={name} required={required} disabled={disabled} placeholder={placeholder} inputClassName={className} options={COUNTRY_OPTIONS.map(country=>({value:country,label:country}))} />;
}
