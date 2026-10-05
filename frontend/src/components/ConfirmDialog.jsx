import { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog — confirmation modal with dark styling
 * Props:
 *   isOpen, onClose, onConfirm, title, message, confirmText, confirmLabel, danger, isLoading
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText,
  confirmLabel = 'Confirm',
  danger = true,
  isLoading = false,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const buttonLabel = confirmText || confirmLabel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all ${
              danger
                ? 'bg-red-600 hover:bg-red-500 shadow-red-500/25'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25'
            } disabled:opacity-50`}
          >
            {isLoading ? 'Processing...' : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export { ConfirmDialog };
