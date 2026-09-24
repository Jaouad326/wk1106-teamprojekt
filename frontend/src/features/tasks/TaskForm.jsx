import { useId, useState } from 'react';
import { initialTaskFields, prepareTaskPayload, STATUS_LABELS } from './taskFormModel.js';

export default function TaskForm({ task, groups, busy, serverError, serverFields = {}, onSave, onCancel }) {
  const [values, setValues] = useState(() => initialTaskFields(task));
  const [localFields, setLocalFields] = useState({});
  const id = useId();
  const groupUnavailable = !task && values.groupId !== '' && !groups.some(group => group.id === values.groupId);
  const groupMessage = 'Die gewählte Gruppe ist nicht mehr verfügbar. Bitte wähle eine andere Zuordnung.';
  const fields = { ...serverFields, ...localFields, ...(groupUnavailable ? { groupId: groupMessage } : {}) };
  const change = key => event => {
    setValues(previous => ({ ...previous, [key]: event.target.value }));
    setLocalFields(previous => ({ ...previous, [key]: undefined }));
  };
  function inputProps(key) {
    return { id: `${id}-${key}`, value: values[key], onChange: change(key),
      'aria-invalid': Boolean(fields[key]), 'aria-describedby': fields[key] ? `${id}-${key}-error` : undefined };
  }
  const error = key => fields[key] ? <p className="tasks-field-error" id={`${id}-${key}-error`}>{fields[key]}</p> : null;
  function submit(event) {
    event.preventDefault();
    const { payload, fields } = prepareTaskPayload(values, task);
    if (groupUnavailable) fields.groupId = groupMessage;
    setLocalFields(fields);
    if (Object.keys(fields).length) return;
    const changes = task ? Object.fromEntries(Object.entries(payload).filter(([key, value]) => value !== task[key])) : payload;
    if (task && !Object.keys(changes).length) { onCancel(); return; }
    onSave(changes);
  }
  return <form className="tasks-form" onSubmit={submit} noValidate>
    <p className="tasks-muted">Pflichtfelder sind mit * gekennzeichnet. Zeiten gelten in deiner lokalen Zeitzone.</p>
    {serverError && <p role="alert" className="tasks-error">{serverError}</p>}
    {Object.keys(localFields).some(key => localFields[key]) && <p role="alert" className="tasks-error">Bitte prüfe die markierten Felder.</p>}
    <fieldset disabled={busy}>
      <label htmlFor={`${id}-title`}>Titel *</label>
      <input {...inputProps('title')} required maxLength={120} autoFocus autoComplete="off" />{error('title')}
      <label htmlFor={`${id}-description`}>Beschreibung</label>
      <textarea {...inputProps('description')} rows={3} maxLength={2000} />{error('description')}
      <div className="tasks-form-grid">
        <div><label htmlFor={`${id}-dueAt`}>Fällig am *</label><input {...inputProps('dueAt')} type="datetime-local" step="any" required />{error('dueAt')}</div>
        <div><label htmlFor={`${id}-effortHours`}>Aufwand in Stunden *</label><input {...inputProps('effortHours')} type="number" min="0.25" max="200" step="any" required />{error('effortHours')}</div>
        <div><label htmlFor={`${id}-importance`}>Wichtigkeit *</label><select {...inputProps('importance')}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 1 ? ' – niedrig' : n === 5 ? ' – hoch' : ''}</option>)}</select>{error('importance')}</div>
        <div><label htmlFor={`${id}-difficulty`}>Schwierigkeit *</label><select {...inputProps('difficulty')}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 1 ? ' – leicht' : n === 5 ? ' – schwer' : ''}</option>)}</select>{error('difficulty')}</div>
      </div>
      {task ? <>
        <label htmlFor={`${id}-status`}>Status</label><select {...inputProps('status')}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error('status')}
        <p className="tasks-muted">Eigentümer und Gruppenzuordnung bleiben unverändert.</p>
      </> : <>
        <label htmlFor={`${id}-groupId`}>Zuordnung</label><select {...inputProps('groupId')}>
          {groupUnavailable && <option value={values.groupId} disabled>Gruppe nicht mehr verfügbar</option>}
          <option value="">Persönliche Aufgabe</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>{error('groupId')}
        {!groups.length && <p className="tasks-muted">Es stehen keine Gruppen zur Auswahl.</p>}
      </>}
      <div className="tasks-actions"><button type="submit">{busy ? 'Wird gespeichert …' : task ? 'Änderungen speichern' : 'Aufgabe anlegen'}</button>
        <button type="button" className="tasks-secondary" onClick={onCancel}>Abbrechen</button></div>
    </fieldset>
  </form>;
}
