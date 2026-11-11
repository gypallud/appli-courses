import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

/** Confirmation avec bouton « Annuler », disparaît seule après 5 s. */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
      <div className="animate-sheet pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-gray-900 px-4 py-3 ring-1 ring-white/10 text-sm text-white shadow-lg">
        <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
        <span className="min-w-0 flex-1 truncate">{toast.text}</span>
        {toast.undo && (
          <button
            type="button"
            onClick={() => { toast.undo(); onClose(); }}
            className="shrink-0 rounded-lg px-2 py-1 font-semibold text-emerald-300 hover:bg-white/10"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
