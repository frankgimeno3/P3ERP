'use client';

import {useState, type InputHTMLAttributes} from 'react';
import {Eye, EyeOff} from 'lucide-react';

export default function PasswordInput({className='', disabled, ...props}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return <span className="relative block">
    <input {...props} disabled={disabled} type={visible ? 'text' : 'password'} className={`${className} pr-12`}/>
    <button type="button" disabled={disabled} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={()=>setVisible(value=>!value)} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-gray-500 transition hover:bg-gray-100 hover:text-blue-950 disabled:cursor-not-allowed disabled:opacity-50">
      {visible ? <EyeOff size={20} aria-hidden="true"/> : <Eye size={20} aria-hidden="true"/>}
    </button>
  </span>;
}
