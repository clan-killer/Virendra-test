
import React from 'react';
import { cn } from '../../utils/cn';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary'|'secondary'|'ghost'|'danger';
  size?: 'sm'|'md'|'lg';
  loading?: boolean;
};

export default function Button({ className, variant='primary', size='md', loading, children, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none dark:focus:ring-offset-gray-950';
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-700 focus:ring-brand',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 focus:ring-gray-400',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  };
  const sizes = { sm: 'h-8 px-3 text-sm', md:'h-10 px-4', lg:'h-12 px-6 text-lg' };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {loading && <span className="mr-2 animate-spin inline-block h-4 w-4 border-2 border-current border-r-transparent rounded-full" />}
      {children}
    </button>
  );
}
