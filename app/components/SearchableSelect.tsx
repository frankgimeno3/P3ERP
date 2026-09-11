'use client';
import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SearchOption = { value: string; label: string; searchText?: string; disabled?: boolean };
type Props = { id?:string; inputClassName?:string; options: SearchOption[]; value: string; onChange: (value: string) => void; label: string; placeholder?: string; required?: boolean; disabled?: boolean; name?: string; className?: string; onSearchChange?: (query: string) => void };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
export default function SearchableSelect({ id:providedId,inputClassName,options, value, onChange, label, placeholder = 'Escribe y selecciona una opción', required = false, disabled = false, name, className = '', onSearchChange }: Props) {
  const generatedId = useId(), id=providedId||generatedId, root = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(0);
  const [position,setPosition] = useState({left:0,top:0,width:0,maxHeight:256});
  useLayoutEffect(()=>{
    if(!open)return;
    const update=()=>{const rect=input.current?.getBoundingClientRect();if(!rect)return;const below=window.innerHeight-rect.bottom-12;const height=Math.min(256,Math.max(below,rect.top-12));setPosition({left:rect.left,top:below>=Math.min(180,height)?rect.bottom+4:Math.max(4,rect.top-height-4),width:rect.width,maxHeight:height});};
    update();window.addEventListener('resize',update);window.addEventListener('scroll',update,true);return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
  },[open]);
  const selected = options.find(option => option.value === value);
  useEffect(() => { input.current?.setCustomValidity(required && !selected?.value ? 'Selecciona una opción del desplegable.' : ''); }, [required, selected]);
  const shown = options.filter(option => normalize(`${option.label} ${option.value} ${option.searchText || ''}`).includes(normalize(query)));
  const choose = (option: SearchOption) => { if (option.disabled) return; onChange(option.value); setOpen(false); setQuery(''); input.current?.focus(); };
  const begin = () => { setOpen(true); setQuery(''); setActive(0); onSearchChange?.(''); };
  const move = (direction: number) => {
    let next = active + direction;
    while (next >= 0 && next < shown.length && shown[next].disabled) next += direction;
    if (next >= 0 && next < shown.length) { setActive(next); document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: 'nearest' }); }
  };
  return <div ref={root} className={`relative ${className}`} onBlur={event => { if (!root.current?.contains(event.relatedTarget as Node)) { setOpen(false); setQuery(''); } }}>
    {name && <input type="hidden" name={name} value={selected?.value || ''} />}
    <input id={id} ref={input} role="combobox" aria-label={label} aria-expanded={open && !disabled} aria-controls={`${id}-options`} aria-autocomplete="list" aria-activedescendant={open && shown[active] ? `${id}-${active}` : undefined} autoComplete="off" disabled={disabled} required={required} placeholder={placeholder} value={open ? query || selected?.label || '' : selected?.label || ''}
      className={`${inputClassName||"w-full rounded border border-gray-300 bg-white px-3 py-2 text-slate-900 outline-none"} enabled:cursor-pointer enabled:hover:border-blue-950 focus:border-blue-950 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500`}
      onFocus={begin} onClick={() => { if (!open) begin(); }}
      onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); if (value) onChange(''); onSearchChange?.(event.target.value); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setQuery(''); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) begin(); else move(event.key === 'ArrowDown' ? 1 : -1); }
        if (event.key === 'Enter' && open) { event.preventDefault(); if (shown[active]) choose(shown[active]); }
      }} />
    {open && !disabled && createPortal(<div id={`${id}-options`} role="listbox" aria-label={label} style={position} className="fixed z-[1000] overflow-auto rounded border border-gray-300 bg-white p-1 text-slate-900 shadow-xl">
      {shown.map((option, i) => <button id={`${id}-${i}`} key={option.value} tabIndex={-1} type="button" role="option" aria-selected={option.value === value} disabled={option.disabled} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)} className={`block w-full rounded px-3 py-2 text-left enabled:cursor-pointer enabled:hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 ${i === active ? 'bg-blue-50' : ''}`}>{option.label}</button>)}
      {!shown.length && <p className="p-3 text-sm text-gray-500">No hay opciones coincidentes.</p>}
    </div>,document.body)}
  </div>;
}
