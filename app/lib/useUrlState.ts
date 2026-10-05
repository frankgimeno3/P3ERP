'use client';
import {useEffect,useState,useRef,type Dispatch,type SetStateAction} from 'react';
export function useUrlState<T>(key:string,initial:T):[T,Dispatch<SetStateAction<T>>]{
  const [value,setValue]=useState(initial),[ready,setReady]=useState(false);
  const defaultValue=useRef(initial).current;
  useEffect(()=>{
    const read=()=>{const stored=new URL(window.location.href).searchParams.get(key);try{const parsed=stored===null?defaultValue:JSON.parse(stored);if(parsed===null||typeof parsed!==typeof defaultValue)throw Error();if(typeof defaultValue==='object')setValue(Object.fromEntries(Object.entries(defaultValue as object).map(([field,fallback])=>[field,typeof parsed[field]===typeof fallback&&(typeof fallback!=='number'||Number.isFinite(parsed[field]))?parsed[field]:fallback])) as T);else if(typeof parsed!=='number'||Number.isFinite(parsed))setValue(parsed);else setValue(defaultValue);}catch{setValue(defaultValue);}setReady(true);};
    read();window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read);
    // The initial default is fixed for this table field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[key]);
  useEffect(()=>{if(!ready)return;const url=new URL(window.location.href);if(JSON.stringify(value)===JSON.stringify(defaultValue))url.searchParams.delete(key);else url.searchParams.set(key,JSON.stringify(value));window.history.replaceState(window.history.state,'',url.toString());},[key,value,ready,defaultValue]);
  return [value,setValue];
}
