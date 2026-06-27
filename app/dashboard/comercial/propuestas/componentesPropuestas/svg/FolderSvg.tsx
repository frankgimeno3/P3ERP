import React, { FC } from 'react';

interface FolderSvgProps {}

const FolderSvg: FC<FolderSvgProps> = ({ }) => {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-10 text-gray-700 cursor-pointer "
      >
        {/* Solapa superior de la carpeta */}
        <path
          d="M6 16C6 13.8 7.8 12 10 12H26L30 16H54C56.2 16 58 17.8 58 20V22H6V16Z"
          fill="currentColor"
          className="opacity-90"
        />
        {/* Cuerpo principal de la carpeta */}
        <rect
          x="6"
          y="22"
          width="52"
          height="34"
          rx="3"
          fill="currentColor"
          className="opacity-60"
        />
      </svg>
    </div>
  );
};

export default FolderSvg;
