export default function ProductionPhaseIcon({phase}:{phase:string}) {
 const icons:Record<string,React.ReactNode>={
  recibir:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  redaccion:<path d="m16 3 5 5-13 13H3v-5L16 3Zm-2 2 5 5"/>,
  maquetacion:<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
  correccion:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  revision:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></>,
  publicacion:<><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>,
  todo:<><path d="M14 2H6a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7l-5-5Zm0 0v5h5M11 10h5m-5 4h5m-5 4h5"/><circle cx="8" cy="10" r=".6" fill="currentColor"/><circle cx="8" cy="14" r=".6" fill="currentColor"/><circle cx="8" cy="18" r=".6" fill="currentColor"/></>,
 };
 return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icons[phase]}</svg>;
}
