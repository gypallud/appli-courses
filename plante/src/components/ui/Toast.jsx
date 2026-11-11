import { useEffect } from 'react';
import Icon from './Icon';

export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      <span className="toast__icon">
        <Icon name={toast.icon || 'check'} size={16} strokeWidth={2.2} />
      </span>
      {toast.message}
    </div>
  );
}
