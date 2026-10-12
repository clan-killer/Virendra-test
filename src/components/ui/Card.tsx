
import React from 'react';
import { cn } from '../../utils/cn';

export function Card({ className, children }: React.PropsWithChildren<{className?: string}>) {
  return <div className={cn("rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm", className)}>{children}</div>;
}
export function CardHeader({ className, children }: any) {
  return <div className={cn("px-5 py-4 border-b border-gray-100 dark:border-gray-800", className)}>{children}</div>;
}
export function CardBody({ className, children }: any) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
