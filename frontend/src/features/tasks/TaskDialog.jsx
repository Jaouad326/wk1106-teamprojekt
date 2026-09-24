import { useEffect, useRef, useId } from 'react';

export default function TaskDialog({ title, busy, onClose, restoreFocusTo, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (restoreFocusTo?.isConnected) restoreFocusTo.focus();
    };
  }, []);
  return <dialog className="tasks-dialog" ref={ref} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="tasks-dialog-heading"><h2 id={titleId}>{title}</h2>
      <button type="button" className="tasks-secondary" aria-label="Dialog schließen" onClick={onClose} disabled={busy}>Schließen</button></div>
    {children}
  </dialog>;
}
