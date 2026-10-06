'use client';
import DatePartsInput from './DatePartsInput';
import { isDateFilterField } from '@/app/lib/dateFilters';

export default function TableFilterInput({ label, field = '', value, onChange, disabled = false, className = '', placeholder }: {
  label: string; field?: string; value: string; onChange: (value: string) => void; disabled?: boolean; className?: string; placeholder?: string;
}) {
  return isDateFilterField(`${field} ${label}`)
    ? <DatePartsInput label={label} hideLabel value={value} onChange={onChange} disabled={disabled} inputClassName={className} />
    : <input type="search" aria-label={`Filtrar ${label}`} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className={className} placeholder={placeholder} />;
}
