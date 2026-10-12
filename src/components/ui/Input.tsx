
import React from 'react';
import { cn } from '../../utils/cn';

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string; };
export default function Input({ label, error, hint, className, ...rest }: Props) {
  return (
    <label className="block">
      {label && <div className="mb-1 text-sm font-medium">{label}</div>}
      <input
        className={cn(
          "w-full rounded-md border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-brand focus:border-brand",
          error && "border-red-500 focus:ring-red-400 focus:border-red-400",
          className
        )}
        {...rest}
      />
      {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </label>
  );
}
