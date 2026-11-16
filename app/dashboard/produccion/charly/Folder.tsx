import Link from 'next/link';
export default function Folder({href,label,detail}:{href:string;label:string;detail?:string}) {
 return <Link href={href} className="relative block w-52 cursor-pointer text-blue-950 transition hover:-translate-y-1 hover:text-blue-700 focus-visible:outline-2"><svg viewBox="0 0 220 170" aria-hidden="true" className="w-full"><path d="M10 38V24a10 10 0 0 1 10-10h65l18 20h97a10 10 0 0 1 10 10v106a10 10 0 0 1-10 10H20a10 10 0 0 1-10-10Z" fill="currentColor" opacity=".16"/><path d="M10 51h200v99a10 10 0 0 1-10 10H20a10 10 0 0 1-10-10Z" fill="currentColor" opacity=".12"/></svg><span className="absolute inset-x-3 top-20 text-center text-xl font-semibold">{label}</span><span className="absolute inset-x-3 top-28 text-center text-xs">{detail}</span></Link>;
}
