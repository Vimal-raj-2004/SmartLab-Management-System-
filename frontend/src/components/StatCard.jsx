import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', isLoading = false }) => {
  const colorMap = {
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   glow: 'shadow-blue-500/10' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', glow: 'shadow-purple-500/10' },
    emerald:{ bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',text: 'text-emerald-400',glow: 'shadow-emerald-500/10' },
    amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  glow: 'shadow-amber-500/10' },
    red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    glow: 'shadow-red-500/10' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', glow: 'shadow-indigo-500/10' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-slate-900 border ${c.border} rounded-2xl p-5 shadow-lg ${c.glow} hover:scale-[1.02] transition-transform duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
      <div className="space-y-0.5">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-7 bg-slate-800 rounded-lg animate-pulse w-16" />
            <div className="h-4 bg-slate-800 rounded animate-pulse w-24" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-extrabold text-white">{value}</p>
            <p className="text-xs text-slate-500">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-600">{subtitle}</p>}
          </>
        )}
      </div>
    </div>
  );
};
