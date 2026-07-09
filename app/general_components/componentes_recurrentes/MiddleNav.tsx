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
    '/dashboard/comercial',
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
      return <Home className="h-4 w-4 text-white" />;  
    }
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <div className="flex flex-row items-center justify-between bg-gradient-to-r from-zinc-700 to-gray-800 px-4 py-2.5 text-white md:px-6">
      <h2 className="text-sm font-semibold uppercase text-zinc-100 md:text-base">{tituloprincipal}</h2>
      <div className="flex flex-row flex-wrap items-center gap-0 pr-2 text-sm md:pr-4">
        {pathSegments.map((segment, index) => {
          const fullPath = buildPath(index);
          const isProblematic = problematicSegments.includes(fullPath);

          return (
            <div className="flex items-center" key={index}>
              {isProblematic ? (
                <p
                  className="flex min-h-[36px] cursor-not-allowed items-center gap-1 rounded-md bg-gray-300/50 px-4 py-2 text-sm font-medium uppercase text-slate-200"
                >
                  {renderSegmentLabel(segment, fullPath)}
                </p>
              ) : (
                <Link
                  href={getHref(index)}
                  className="flex min-h-[36px] items-center gap-1 rounded-md bg-gray-300/50 px-4 py-2 text-sm font-medium uppercase text-white transition-colors hover:bg-gray-300/60"
                >
                  {renderSegmentLabel(segment, fullPath)}
                </Link>
              )}
              {index < pathSegments.length - 1 && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-1 h-4 w-4 text-blue-200/80"
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
