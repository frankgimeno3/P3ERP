'use client';

import React, { FC } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react'; 

interface MiddleNavProps {
  tituloprincipal: string;
}

const MiddleNav: FC<MiddleNavProps> = ({ tituloprincipal }) => {
  const pathname = usePathname();

  const pathSegments = pathname.split('/').filter(Boolean);

  const buildPath = (index: number) =>
    '/' + pathSegments.slice(0, index + 1).join('/');

  const problematicSegments = [
    '/dashboard/fichajes',
    '/dashboard/comercial',
    '/dashboard/clientes',
    '/dashboard/produccion',
    '/dashboard/administracion',
    '/dashboard/operaciones',
    '/dashboard/operaciones/data/importar',
    '/dashboard/operaciones/data/exportar'
    ];

  const getHref = (index: number) => {
    const fullPath = buildPath(index);
    if (problematicSegments.includes(fullPath)) {
      return '/dashboard';
    } else {
      return fullPath;
    }
  };

   const renderSegmentLabel = (segment: string, fullPath: string) => {
    if (fullPath === '/' || fullPath === '/dashboard') {
      return <Home className="w-5 h-5  text-gray-600 mx-4" />;  
    }
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <div className="flex flex-row text-white  items-center justify-between bg-blue-950/70 px-8 py-1">
      <h2 className="text-xl font-black">{tituloprincipal}</h2>
      <div className="flex flex-row flex-wrap items-center gap-1 py-3 ">
        {pathSegments.map((segment, index) => {
          const fullPath = buildPath(index);
          const isProblematic = problematicSegments.includes(fullPath);

          return (
            <div className="flex items-center" key={index}>
              {isProblematic ? (
                <p
                  className="flex items-center gap-1 px-3 py-1 rounded bg-white text-sm text-gray-400 cursor-not-allowed text-gray-300"
                >
                  {renderSegmentLabel(segment, fullPath)}
                </p>
              ) : (
                <Link
                  href={getHref(index)}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-white text-sm text-gray-400 cursor-pointer hover:bg-gray-200 text-gray-600 font-base"
                >
                  {renderSegmentLabel(segment, fullPath)}
                </Link>
              )}
              {index < pathSegments.length - 1 && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-1 h-4 w-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiddleNav;
