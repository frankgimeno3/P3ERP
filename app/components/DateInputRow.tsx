'use client';
import { Children, Fragment, type ReactNode } from 'react';

export default function DateInputRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const fields = Children.toArray(children);
  return <div className={`date-input-row ${className}`}>
    {fields.map((field, index) => <Fragment key={index}>
      {index > 0 && <span aria-hidden="true" className="shrink-0 text-gray-500">/</span>}
      {field}
    </Fragment>)}
  </div>;
}
