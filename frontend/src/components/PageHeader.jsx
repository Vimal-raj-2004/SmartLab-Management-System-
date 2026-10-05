/**
 * PageHeader — page title + optional action button
 * Props: title, subtitle, action / actions (JSX)
 */
export default function PageHeader({ title, subtitle, action, actions, icon: Icon, iconColor = 'blue' }) {
  const actionContent = actions || action;

  const colorMap = {
    blue: 'from-blue-600 to-indigo-600 shadow-blue-500/20 text-white',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20 text-white',
    cyan: 'from-cyan-500 to-blue-600 shadow-cyan-500/20 text-white',
    purple: 'from-purple-600 to-indigo-600 shadow-purple-500/20 text-white',
  };

  const iconClasses = colorMap[iconColor] || colorMap.blue;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${iconClasses} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actionContent && <div className="flex items-center gap-2 flex-wrap">{actionContent}</div>}
    </div>
  );
}

export { PageHeader };
