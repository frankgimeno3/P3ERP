'use client';
import SearchableSelect from './SearchableSelect';
import { supplierCountries } from '@/app/data/supplierCountries.js';
export default function SupplierCountrySelect({value,onChange}:{value:string;onChange:(v:string)=>void}) {
 return <SearchableSelect label="País" value={value} onChange={onChange} required options={supplierCountries.map(c=>({value:c.name,label:c.name,searchText:c.code}))} />;
}
