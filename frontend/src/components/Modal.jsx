import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal — generic slide-in modal shell with dark theme
 * Props: isOpen, onClose, title, children, size ('sm'|'md'|'lg'|'xl')
 */
export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${sizeClasses[size] || sizeClasses.md} max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden transform transition-all my-auto`}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 sticky top-0 bg-slate-900 z-10 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800">
          <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            title="Close"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 sm:py-5 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export { Modal };
