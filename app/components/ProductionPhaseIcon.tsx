export default function ProductionPhaseIcon({phase}:{phase:string}) {
 const icons:Record<string,React.ReactNode>={
  recibir:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  redaccion:<><rect x="3" y="3" width="13" height="14" rx="3"/><path d="M7 7v4h4M7 9h4m1 12 8-8-3-3-8 8-1 4 4-1m3-8 3 3"/></>,
  maquetacion:<><rect x="2" y="3" width="18" height="14" rx="2"/><circle cx="7" cy="7" r="1"/><path d="m4 14 4-4 3 3 3-3 2 2m-3 9 8-8-3-3-8 8-1 4 4-1m2-8 3 3"/></>,
  correccion:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  revision:<><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>,
  todo:<><path d="M14 2H6a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7l-5-5Zm0 0v5h5M11 10h5m-5 4h5m-5 4h5"/><circle cx="8" cy="10" r=".6" fill="currentColor"/><circle cx="8" cy="14" r=".6" fill="currentColor"/><circle cx="8" cy="18" r=".6" fill="currentColor"/></>,
 };
 return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icons[phase]}</svg>;
}
