import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createTaskApi } from './taskApi.js';
import { STATUS_LABELS } from './taskFormModel.js';
import TaskDialog from './TaskDialog.jsx';
import TaskForm from './TaskForm.jsx';
import './tasks.css';

// groups kommt aus Haizams Modul; onSelectTask öffnet optional Ahshans Details.
export default function TasksPage({ api, groups = [], onSelectTask, refreshGroups }) {
  const filterId = useId();
  const client = useMemo(() => createTaskApi(api), [api]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [serverFields, setServerFields] = useState({});
  const requestNumber = useRef(0);
  const actionInFlight = useRef(false);
  const dialogOpener = useRef(null);
  const load = useCallback(async () => {
    const number = ++requestNumber.current;
    setLoading(true); setLoadError('');
    try {
      const [visible] = await Promise.all([client.list(), refreshGroups?.()]);
      if (number === requestNumber.current) setTasks(visible);
    } catch (error) {
      if (number === requestNumber.current) { setTasks([]); setLoadError(error.message); }
    } finally { if (number === requestNumber.current) setLoading(false); }
  }, [client, refreshGroups]);
  useEffect(() => { load(); return () => { requestNumber.current += 1; }; }, [load]);

  function openDialog(value) { dialogOpener.current = document.activeElement; setActionError(''); setServerFields({}); setMessage(''); setDialog(value); }
  function closeDialog() { if (!actionInFlight.current) setDialog(null); }
  async function mutate(action, success) {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true); setActionError(''); setServerFields({}); setMessage('');
    try { await action(); setDialog(null); setMessage(success); }
    catch (error) {
      setActionError(error.message); setServerFields(error.fields || {});
      if ([401, 403, 404].includes(error.status)) await load();
    } finally { actionInFlight.current = false; setBusy(false); }
  }
  function save(payload) {
    return mutate(async () => {
      const saved = dialog.task ? await client.update(dialog.task.id, payload) : await client.create(payload);
      setTasks(previous => dialog.task ? previous.map(task => task.id === saved.id ? saved : task) : [saved, ...previous]);
      // Eine neue offene Aufgabe bleibt auch bei vorherigem Erledigt-Filter sichtbar.
      if (!dialog.task) setFilter('all');
    }, dialog.task ? 'Änderungen gespeichert.' : 'Aufgabe angelegt.');
  }
  function remove() {
    return mutate(async () => {
      await client.remove(dialog.task.id);
      setTasks(previous => previous.filter(task => task.id !== dialog.task.id));
    }, 'Aufgabe und zugehörige Kommentare gelöscht.');
  }
  const visible = tasks.filter(task => filter === 'all' || task.status === filter);
  return <section className="tasks-page" aria-label="Aufgabenverwaltung">
    <header className="tasks-heading"><div><p className="tasks-eyebrow">STUDYPRIO · AUFGABEN</p><h2>Deine Aufgaben im Blick</h2>
      <p className="tasks-muted">Plane deinen nächsten Schritt und halte deinen Fortschritt fest.</p></div>
      <button disabled={loading || busy || Boolean(loadError)} onClick={() => openDialog({ type: 'form' })}>+ Neue Aufgabe</button></header>
    <div className="tasks-toolbar"><div className="tasks-filter"><label htmlFor={filterId}>Status</label><select id={filterId} value={filter} onChange={event => setFilter(event.target.value)}>
      <option value="all">Alle Aufgaben ({tasks.length})</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label} ({tasks.filter(task => task.status === value).length})</option>)}
    </select></div><button className="tasks-secondary" disabled={loading || busy} onClick={load}>Aktualisieren</button></div>
    {message && <p className="tasks-success" role="status">{message}</p>}
    {loading ? <p role="status">Aufgaben werden geladen …</p> : loadError ? <div className="tasks-error" role="alert"><p>{loadError}</p><button onClick={load}>Erneut versuchen</button></div>
      : !visible.length ? <div className="tasks-empty"><h3>{tasks.length ? 'Keine Aufgaben mit diesem Status' : 'Platz für deinen nächsten Schritt'}</h3>
        <p>{tasks.length ? 'Wähle einen anderen Filter, um deine Aufgaben zu sehen.' : 'Lege eine Aufgabe mit Termin und Aufwand an.'}</p></div>
      : <ul className="tasks-list">{visible.map(task => <li key={task.id}><article className="tasks-card">
        <div className="tasks-card-top"><span className={`tasks-status tasks-status-${task.status}`}>{STATUS_LABELS[task.status]}</span>
          <span className="tasks-muted">{task.groupId === null ? 'Persönlich' : groups.find(group => group.id === task.groupId)?.name || 'Gruppenaufgabe'}</span></div>
        <h3>{task.title}</h3>{task.description && <p className="tasks-description">{task.description}</p>}
        <dl className="tasks-metadata"><div><dt>Fällig</dt><dd><time dateTime={task.dueAt}><span>{new Date(task.dueAt).toLocaleDateString('de-DE')}</span><span>{new Date(task.dueAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span></time></dd></div>
          <div><dt>Aufwand</dt><dd>{task.effortHours.toLocaleString('de-DE')} Std.</dd></div>
          <div><dt>Wichtigkeit</dt><dd>{task.importance} / 5</dd></div><div><dt>Schwierigkeit</dt><dd>{task.difficulty} / 5</dd></div></dl>
        <div className="tasks-actions">
          <button className="tasks-secondary" disabled={busy} onClick={() => openDialog({ type: 'form', task })} aria-label={`Bearbeiten: ${task.title}`}>Bearbeiten</button>
          {onSelectTask && <button className="tasks-secondary" onClick={() => onSelectTask(task.id)}>Details & Kommentare</button>}
          <button className="tasks-danger" disabled={busy} onClick={() => openDialog({ type: 'delete', task })} aria-label={`Löschen: ${task.title}`}>Löschen</button>
        </div></article></li>)}</ul>}
    {dialog && <TaskDialog title={dialog.type === 'delete' ? 'Aufgabe löschen?' : dialog.task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} busy={busy} onClose={closeDialog} restoreFocusTo={dialogOpener.current}>
      {dialog.type === 'form' ? <TaskForm task={dialog.task} groups={groups} busy={busy} serverError={actionError} serverFields={serverFields} onSave={save} onCancel={closeDialog} />
        : <><p>„{dialog.task.title}“ und alle zugehörigen Kommentare werden dauerhaft gelöscht.</p>
          {actionError && <p role="alert" className="tasks-error">{actionError}</p>}
          <div className="tasks-actions"><button className="tasks-danger" disabled={busy} onClick={remove}>{busy ? 'Wird gelöscht …' : 'Endgültig löschen'}</button>
            <button className="tasks-secondary" disabled={busy} onClick={closeDialog}>Abbrechen</button></div></>}
    </TaskDialog>}
  </section>;
}
