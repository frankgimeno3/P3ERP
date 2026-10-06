'use client';

import React, { Children, Fragment, cloneElement, isValidElement, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { compareTableValues } from '@/app/lib/tableSorting';

export type TableSort = { column: number; direction: 'asc' | 'desc' };
type Element = React.ReactElement<any>;
type Props = React.TableHTMLAttributes<HTMLTableElement> & {
  sort?: TableSort | null;
  onSortChange?: (sort: TableSort) => void;
};
type Entry = { node: React.ReactNode; key: string; count: number; fixed: boolean };

function nodes(children: React.ReactNode): React.ReactNode[] { return Children.toArray(children); }
function rowCount(node: React.ReactNode): number {
  if (!isValidElement(node)) return 0;
  const element = node as Element;
  if (element.type === 'tr') return 1;
  if (element.type === Fragment) return nodes(element.props.children).reduce<number>((sum, child) => sum + rowCount(child),0);
  return typeof element.type === 'string' ? 0 : 1;
}
function fixed(node: React.ReactNode): boolean {
  if (!isValidElement(node)) return true;
  const element = node as Element;
  if (element.type === Fragment) return fixed(nodes(element.props.children).find(child => rowCount(child)>0));
  if (element.type !== 'tr') return false;
  return element.props['data-sort-fixed'] || nodes(element.props.children).some(child => isValidElement(child) && Number((child as Element).props.colSpan || 1) > 1);
}
function text(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join(' ');
  if (!isValidElement(node)) return '';
  const element = node as Element;
  return text(element.props.children) || element.props['aria-label'] || '';
}
function value(cell?: HTMLTableCellElement): string {
  if (!cell) return '';
  if (cell.dataset.sortValue !== undefined) return cell.dataset.sortValue;
  const fields = Array.from(cell.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input:not([type=hidden]),select,textarea'));
  if (fields.length) return fields.map(field => field instanceof HTMLSelectElement ? field.selectedOptions[0]?.textContent || '' : field instanceof HTMLInputElement && ['checkbox','radio'].includes(field.type) ? (field.checked ? '1' : '0') : field instanceof HTMLInputElement && field.type==='number' ? field.value.replace('.',',') : field.value).join(' / ');
  return cell.textContent?.trim() || Array.from(cell.querySelectorAll('[aria-label],[title]')).map(element=>element.getAttribute('aria-label')||element.getAttribute('title')||'').join(' ');
}
function cellAt(row: HTMLTableRowElement, column: number) {
  let offset = 0;
  for (const cell of Array.from(row.cells)) { if (column >= offset && column < offset + cell.colSpan) return cell; offset += cell.colSpan; }
}

/** Orders React row groups, preserving their keys, controls and event handlers. */
export default function SortableTable({ children, sort: controlled, onSortChange, ...props }: Props) {
  const table = useRef<HTMLTableElement>(null);
  const [local, setLocal] = useState<TableSort | null>(null);
  const [values, setValues] = useState<Record<string,string[]>>({});
  const sort = onSortChange ? controlled : local;
  const sections = useMemo(()=>nodes(children),[children]);
  const entries: Entry[][] = useMemo(()=>{
    const bodies=sections.filter(node=>isValidElement(node)&&node.type==='tbody') as Element[];
    return bodies.map((body, bodyIndex) => nodes(body.props.children).map((node,index) => ({ node, key: `${bodyIndex}:${isValidElement(node) ? node.key ?? index : index}`, count: rowCount(node), fixed: fixed(node) })));
  },[sections]);
  const ordered = useMemo(()=>entries.map(list => {
    if (!sort || onSortChange) return list;
    const result = [...list];
    // Empty states, section headings and totals remain in their original positions.
    for (let start=0; start<result.length;) {
      if (result[start].fixed) { start++; continue; }
      let end=start+1; while(end<result.length && !result[end].fixed) end++;
      result.splice(start,end-start,...result.slice(start,end).sort((a,b) => compareTableValues(values[a.key]?.[sort.column],values[b.key]?.[sort.column],sort.direction)));
      start=end;
    }
    return result;
  }),[entries,sort,onSortChange,values]);
  const snapshot = useCallback(() => {
    const next: Record<string,string[]> = {};
    ordered.forEach((list,index) => {
      const rows = Array.from(table.current?.tBodies[index]?.rows || []); let offset=0;
      list.forEach(entry => { const row=rows[offset]; if(row) next[entry.key]=Array.from({length:Array.from(row.cells).reduce((sum,cell)=>sum+cell.colSpan,0)},(_,column)=>value(cellAt(row,column))); offset+=entry.count; });
    });
    return next;
  },[ordered]);
  useLayoutEffect(() => {
    if (!sort || onSortChange) return;
    const next=snapshot();
    if (JSON.stringify(Object.entries(next).sort()) !== JSON.stringify(Object.entries(values).sort())) setValues(next);
  },[sort,onSortChange,snapshot,values]);
  const choose = (column: number) => {
    const next: TableSort = { column, direction: sort?.column === column && sort.direction === 'asc' ? 'desc' : 'asc' };
    if (onSortChange) onSortChange(next);
    else { setValues(snapshot()); setLocal(next); }
  };
  let bodyIndex=0;
  const rendered=sections.map(node => {
    if (!isValidElement(node)) return node;
    const section=node as Element;
    if (section.type === 'tbody') {
      const list=ordered[bodyIndex++];
      return cloneElement(section,{},list.map(entry=>entry.node));
    }
    if (section.type !== 'thead') return section;
    const occupied: Record<number,Set<number>>={};
    return cloneElement(section,{},nodes(section.props.children).map((row,rowIndex) => {
      if (!isValidElement(row) || row.type !== 'tr') return row;
      let column=0;
      return cloneElement(row as Element,{},nodes((row as Element).props.children).map(cell => {
        if (!isValidElement(cell) || cell.type !== 'th') return cell;
        while(occupied[rowIndex]?.has(column)) column++;
        const header=cell as Element,index=column,span=Number(header.props.colSpan||1);
        for(let nextRow=rowIndex+1;nextRow<rowIndex+Number(header.props.rowSpan||1);nextRow++){
          occupied[nextRow]??=new Set();for(let nextColumn=index;nextColumn<index+span;nextColumn++)occupied[nextRow].add(nextColumn);
        }
        column+=span;
        if (Number(header.props.colSpan||1)>1) return header;
        const active=sort?.column===index, Icon=active?(sort.direction==='asc'?ArrowUp:ArrowDown):ArrowUpDown;
        const label=text(header.props.children).trim() || `columna ${index+1}`;
        const button=<button type="button" data-table-sort-button aria-label={`Ordenar por ${label} ${active&&sort.direction==='asc'?'descendente':'ascendente'}`} onClick={event=>{event.stopPropagation();choose(index);}} className="table-sort-button inline-flex cursor-pointer items-center justify-center rounded p-1 transition-colors hover:bg-current/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"><Icon size={16} aria-hidden="true" className={`shrink-0 ${active?'opacity-100':'opacity-60'}`} /></button>;
        return cloneElement(header,{'aria-sort':active?(sort.direction==='asc'?'ascending':'descending'):'none'},<div className="flex items-center justify-between gap-2"><span>{header.props.children}</span>{button}</div>);
      }));
    }));
  });
  return <table {...props} ref={table}>{rendered}</table>;
}
