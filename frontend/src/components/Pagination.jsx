import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination — page navigation bar with dark styling
 * Props: page, currentPage, totalPages, onPageChange, total, pageSize
 */
export default function Pagination({ page, currentPage, totalPages, onPageChange, total, pageSize }) {
  const activePage = page || currentPage || 1;
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left = activePage - delta;
  const right = activePage + delta;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i <= right)) {
      pages.push(i);
    }
  }

  const withEllipsis = [];
  let prev = null;
  for (const p of pages) {
    if (prev && p - prev > 1) {
      withEllipsis.push('...');
    }
    withEllipsis.push(p);
    prev = p;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400">
      <div>
        {total !== undefined ? (
          <span>
            Showing <strong className="text-white">{(activePage - 1) * (pageSize || 10) + 1}</strong> to{' '}
            <strong className="text-white">{Math.min(activePage * (pageSize || 10), total)}</strong> of{' '}
            <strong className="text-white">{total}</strong> items
          </span>
        ) : (
          <span>
            Page <strong className="text-white">{activePage}</strong> of{' '}
            <strong className="text-white">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(activePage - 1)}
          disabled={activePage <= 1}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {withEllipsis.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-slate-500">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[28px] h-7 px-2 rounded-lg font-semibold transition-all ${
                p === activePage
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(activePage + 1)}
          disabled={activePage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export { Pagination };
