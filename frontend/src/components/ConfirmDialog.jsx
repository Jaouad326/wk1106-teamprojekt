import { useEffect, useId, useRef } from 'react';
import './confirm-dialog.css';

export default function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel, busy = false, error = '' }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <p className="dashboard-eyebrow">BITTE BESTÄTIGEN</p>
    <h2 id={titleId}>{title}</h2>
    <div className="confirm-description">{children}</div>
    {error && <p className="groups-error" role="alert">{error}</p>}
    <div className="confirm-actions">
      <button type="button" className="ui-button ui-button-secondary" autoFocus disabled={busy} onClick={onCancel}>Abbrechen</button>
      <button type="button" className="ui-button" disabled={busy} onClick={onConfirm}>{busy ? 'Einen Moment …' : confirmLabel}</button>
    </div>
  </dialog>;
}
