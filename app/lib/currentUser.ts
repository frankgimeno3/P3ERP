import { useEffect, useState } from 'react';
import {request} from './request';

export type CurrentUser = { name: string; email: string; role: string; id_agente: string | null };
let pending: Promise<CurrentUser> | null = null;
let loadedAt=0;
export function getCurrentUser(): Promise<CurrentUser> {
  if (!pending||Date.now()-loadedAt>300000){loadedAt=Date.now();pending = request('/api/validate-token', { method: 'POST', credentials: 'include' }).then(async response => {
    if (!response.ok) throw new Error('No se pudo cargar la sesión.');
    return response.json();
  }).catch(error => { pending = null; throw error; });
  }
  return pending;
}
export function clearCurrentUser() { pending = null;loadedAt=0; }
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh=()=>{if(document.visibilityState==='hidden')return;getCurrentUser().then(value => { if (active){setUser(value);setError('');} }).catch(cause => { if (active) setError(cause.message); });};
    refresh();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return () => { active = false;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh); };
  }, []);
  return { user, error };
}
