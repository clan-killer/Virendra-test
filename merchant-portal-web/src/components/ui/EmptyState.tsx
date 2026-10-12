
import { Inbox } from 'lucide-react';
export default function EmptyState({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: React.ReactNode }) {
  return (
    <div className="text-center py-16 border border-dashed rounded-xl border-gray-300 dark:border-gray-700">
      <Inbox className="mx-auto h-10 w-10 text-gray-400" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-gray-500">{subtitle}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
