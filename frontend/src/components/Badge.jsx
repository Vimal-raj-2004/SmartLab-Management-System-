import React from 'react';

const STATUS_COLORS = {
  // Lab statuses
  active:       'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  inactive:     'bg-slate-500/15 text-slate-400 border-slate-500/20',
  maintenance:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  closed:       'bg-red-500/15 text-red-400 border-red-500/20',
  // PC statuses
  available:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  working:      'bg-blue-500/15 text-blue-400 border-blue-500/20',
  in_use:       'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  not_working:  'bg-red-500/15 text-red-400 border-red-500/20',
  // Inventory statuses
  under_repair: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  disposed:     'bg-red-500/15 text-red-400 border-red-500/20',
  // Item conditions
  excellent:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  good:         'bg-blue-500/15 text-blue-400 border-blue-500/20',
  fair:         'bg-amber-500/15 text-amber-400 border-amber-500/20',
  poor:         'bg-orange-500/15 text-orange-400 border-orange-500/20',
  damaged:      'bg-red-500/15 text-red-400 border-red-500/20',
  // User roles
  admin:        'bg-purple-500/15 text-purple-400 border-purple-500/20',
  faculty:      'bg-blue-500/15 text-blue-400 border-blue-500/20',
  lab_assistant:'bg-amber-500/15 text-amber-400 border-amber-500/20',
  student:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  // Complaint & Maintenance statuses
  open:         'bg-sky-500/15 text-sky-400 border-sky-500/20',
  assigned:     'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  resolved:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  pending:      'bg-amber-500/15 text-amber-400 border-amber-500/20',
  completed:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  // Severity & Priority
  high:         'bg-rose-500/15 text-rose-400 border-rose-500/20',
  medium:       'bg-amber-500/15 text-amber-400 border-amber-500/20',
  low:          'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  critical:     'bg-red-600/20 text-red-300 border-red-500/30',
};

export const Badge = ({ value, label, className = '' }) => {
  const key = (value || '').toLowerCase().replace(/ /g, '_');
  const colorClass = STATUS_COLORS[key] || 'bg-slate-500/15 text-slate-400 border-slate-500/20';
  const displayLabel = label || (value || '').replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${colorClass} ${className}`}>
      {displayLabel}
    </span>
  );
};
