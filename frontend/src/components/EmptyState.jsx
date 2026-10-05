import React from 'react';
import { PackageSearch } from 'lucide-react';

export const EmptyState = ({ title = 'No results found', message = 'Try adjusting your search or filters.', icon: Icon = PackageSearch }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-slate-500" />
    </div>
    <p className="text-base font-semibold text-slate-300">{title}</p>
    <p className="text-sm text-slate-500 mt-1 max-w-xs">{message}</p>
  </div>
);

export default EmptyState;
