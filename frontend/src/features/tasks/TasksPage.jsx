import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import CommentSection from '../comments/CommentSection.jsx';
import './tasks.css';

const emptyTask = { title: '', description: '', dueAt: '', importance: 3, difficulty: 3, effortHours: 1, groupId: '' };
const STATUS_LABELS = { open: 'Offen', in_progress: 'In Arbeit', done: 'Erledigt' };

function toPayload(values) {
  return {
    title: values.title.trim(),
    description: values.description || '',
    dueAt: new Date(values.dueAt).toISOString(),
    importance: Number(values.importance),
    difficulty: Number(values.difficulty),
    effortHours: Number(values.effortHours)
  };
}
function toFormValues(task) {
  const due = new Date(task.dueAt);
  const localDue = new Date(due.getTime() - due.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  return {
    title: task.title, description: task.description, dueAt: localDue,
    importance: task.importance, difficulty: task.difficulty, effortHours: task.effortHours
  };
}

function TaskFields({ values, onChange, groups, showGroup }) {
  const dueInputRef = useRef(null);

  function openCalendar(event) {
    event.preventDefault();
    dueInputRef.current?.showPicker?.();
    dueInputRef.current?.focus();
  }

  return <>
    <input required placeholder="Titel" value={values.title} onChange={event => onChange({ ...values, title: event.target.value })} />
    <textarea placeholder="Beschreibung (optional)" rows={2} value={values.description || ''}
      onChange={event => onChange({ ...values, description: event.target.value })} />
    <div className="task-field-row">
      <label>Fällig
        <span className="date-input-wrap">
          <input ref={dueInputRef} required type="datetime-local" value={values.dueAt}
            onChange={event => onChange({ ...values, dueAt: event.target.value })} />
          <button type="button" className="calendar-button" onMouseDown={openCalendar} aria-label="Kalender öffnen">📅</button>
        </span>
      </label>
      <label>Wichtigkeit
        <select value={values.importance} onChange={event => onChange({ ...values, importance: event.target.value })}>
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label>Schwierigkeit
        <select value={values.difficulty} onChange={event => onChange({ ...values, difficulty: event.target.value })}>
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label>Aufwand (Std.)
        <input required type="number" min="0.25" max="200" step="0.25" value={values.effortHours}
          onChange={event => onChange({ ...values, effortHours: event.target.value })} />
      </label>
      {showGroup && (
        <label>Gruppe
          <select value={values.groupId || ''} onChange={event => onChange({ ...values, groupId: event.target.value })}>
            <option value="">Persönlich</option>
            {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
      )}
    </div>
  </>;
}

function TaskItem({ task, groups, editingId, setEditingId, openCommentsId, setOpenCommentsId, onSave, onStatusChange, onRemove }) {
  const [draft, setDraft] = useState(() => toFormValues(task));
  const isEditing = editingId === task.id;
  const commentsOpen = openCommentsId === task.id;
  const groupName = task.groupId ? groups.find(group => group.id === task.groupId)?.name : null;

  if (isEditing) {
    return <article className="task-item is-editing">
      <TaskFields values={draft} onChange={setDraft} groups={groups} showGroup={false} />
      <div className="task-actions">
        <button type="button" onClick={() => onSave(task.id, draft)}>Speichern</button>
        <button type="button" onClick={() => setEditingId(null)}>Abbrechen</button>
      </div>
    </article>;
  }

  function closeCommentsOutsidePanel(event) {
    if (commentsOpen && !event.target.closest('.comments-panel') && !event.target.closest('.comments-toggle')) {
      setOpenCommentsId(null);
    }
  }

  return <article className="task-item" onClick={closeCommentsOutsidePanel}>
    <div className="task-item-main">
      <div className="task-item-heading">
        <span className={`priority-badge priority-${task.priority.label.toLowerCase().replace(' ', '-')}`}>{task.priority.label}</span>
        <h3>{task.title}</h3>
      </div>
      {task.description && <p className="task-description">{task.description}</p>}
      <p className="task-meta">
        Fällig: {new Date(task.dueAt).toLocaleString('de-DE')}
        {task.priority.overdue && <span className="task-overdue"> · überfällig</span>}
        {' · '}Wichtigkeit {task.importance}/5 · Schwierigkeit {task.difficulty}/5 · {task.effortHours} Std.
        {groupName && <> · Gruppe: {groupName}</>}
      </p>
    </div>
    <div className="task-actions">
      <select value={task.status} onChange={event => onStatusChange(task, event.target.value)}>
        {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="button" onClick={() => { setDraft(toFormValues(task)); setEditingId(task.id); }}>Bearbeiten</button>
      <button className="comments-toggle" type="button" onClick={() => setOpenCommentsId(commentsOpen ? null : task.id)}>Kommentare</button>
      <button type="button" onClick={() => onRemove(task)}>Löschen</button>
    </div>
    {commentsOpen && <CommentSection taskId={task.id} onClose={() => setOpenCommentsId(null)} />}
  </article>;
}

export default function TasksPage({ onSummaryChange, groups, refreshKey }) {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [openCommentsId, setOpenCommentsId] = useState(null);

  async function loadTasks() { try { setTasks(await api('/tasks')); } catch (requestError) { setError(requestError.message); } }
  useEffect(() => { loadTasks(); }, [refreshKey]);

  useEffect(() => {
    if (!onSummaryChange) return;
    const openTasks = tasks.filter(task => task.status !== 'done');
    const isDueToday = task => {
      const due = new Date(task.dueAt);
      const now = new Date();
      return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
    };
    const byGroup = groups.map(group => {
      const groupTasks = tasks.filter(task => task.groupId === group.id);
      return { id: group.id, name: group.name, total: groupTasks.length, done: groupTasks.filter(task => task.status === 'done').length };
    }).filter(entry => entry.total > 0);
    const recentActivity = [...tasks]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 4);
    onSummaryChange({
      total: tasks.length,
      open: openTasks.length,
      overdue: openTasks.filter(task => task.priority?.overdue).length,
      dueToday: openTasks.filter(isDueToday).length,
      done: tasks.length - openTasks.length,
      // Aufgaben kommen bereits nach Priorität sortiert von der API.
      topTasks: openTasks.slice(0, 3),
      byGroup,
      recentActivity
    });
    // onSummaryChange kommt aus dem Dashboard und muss sich nicht selbst als Abhängigkeit eintragen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, groups]);

  async function createTask(event) {
    event.preventDefault(); if (!form.title.trim() || saving) return;
    setSaving(true); setError('');
    try {
      await api('/tasks', { method: 'POST', body: { ...toPayload(form), groupId: form.groupId || null } });
      setForm(emptyTask); await loadTasks();
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  async function saveTask(id, values) {
    setError('');
    try { await api(`/tasks/${id}`, { method: 'PATCH', body: toPayload(values) }); setEditingId(null); await loadTasks(); }
    catch (requestError) { setError(requestError.message); }
  }
  async function updateStatus(task, status) {
    try { await api(`/tasks/${task.id}`, { method: 'PATCH', body: { status } }); await loadTasks(); }
    catch (requestError) { setError(requestError.message); }
  }
  async function removeTask(task) {
    try { await api(`/tasks/${task.id}`, { method: 'DELETE', body: {} }); await loadTasks(); }
    catch (requestError) { setError(requestError.message); }
  }

  return <section className="tasks-panel" aria-label="Aufgabenplanung">
    <div className="tasks-heading"><div><p className="dashboard-eyebrow">PLANUNG</p><h2>Meine Aufgaben</h2></div><span>{tasks.length}</span></div>
    {error && <p className="tasks-error" role="alert">{error}</p>}
    <form className="task-create-form" onSubmit={createTask}>
      <TaskFields values={form} onChange={setForm} groups={groups} showGroup />
      <button type="submit" disabled={saving}>{saving ? 'Speichern ...' : 'Aufgabe hinzufügen'}</button>
    </form>
    <div className="task-list">
      {tasks.length === 0 ? <p className="tasks-empty">Noch keine Aufgaben. Lege deine erste Aufgabe an.</p> : tasks.map(task => (
        <TaskItem key={task.id} task={task} groups={groups}
          editingId={editingId} setEditingId={setEditingId}
          openCommentsId={openCommentsId} setOpenCommentsId={setOpenCommentsId}
          onSave={saveTask} onStatusChange={updateStatus} onRemove={removeTask} />
      ))}
    </div>
  </section>;
}
