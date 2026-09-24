import { TaskError } from './taskError.js';

export const TASK_STATUSES = ['open', 'in_progress', 'done'];
const editable = ['title', 'description', 'dueAt', 'importance', 'difficulty', 'effortHours'];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

export function normalizeDueAt(value) {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const normalized = new Date(timestamp);
  if (Number.isNaN(normalized.getTime())) return null;
  return normalized.toISOString();
}

export function validateTaskInput(input, { patch = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TaskError(400, 'VALIDATION_ERROR', 'Bitte sende ein JSON-Objekt.');
  }
  const allowed = [...editable, patch ? 'status' : 'groupId'];
  const fields = {};
  const values = {};
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) fields[key] = 'Dieses Feld darf nicht gesetzt oder geändert werden.';
  }
  if (patch && Object.keys(input).length === 0) fields._form = 'Mindestens ein Änderungsfeld ist erforderlich.';
  for (const field of ['title', 'dueAt', 'importance', 'difficulty', 'effortHours']) {
    if (!patch && !own(input, field)) fields[field] = 'Dieses Feld ist erforderlich.';
  }
  if (own(input, 'title')) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 120) fields.title = 'Der Titel muss nach dem Kürzen 1–120 Zeichen enthalten.';
    else values.title = input.title.trim();
  }
  if (own(input, 'description')) {
    if (typeof input.description !== 'string' || input.description.length > 2000) fields.description = 'Die Beschreibung darf höchstens 2.000 Zeichen enthalten.';
    else values.description = input.description;
  } else if (!patch) values.description = '';
  if (own(input, 'dueAt')) {
    values.dueAt = normalizeDueAt(input.dueAt);
    if (!values.dueAt) fields.dueAt = 'Ein gültiger Zeitpunkt ist erforderlich.';
  }
  for (const field of ['importance', 'difficulty']) {
    if (!own(input, field)) continue;
    if (!Number.isInteger(input[field]) || input[field] < 1 || input[field] > 5) fields[field] = 'Bitte eine ganze Zahl von 1 bis 5 angeben.';
    else values[field] = input[field];
  }
  if (own(input, 'effortHours')) {
    if (typeof input.effortHours !== 'number' || !Number.isFinite(input.effortHours) || input.effortHours < 0.25 || input.effortHours > 200) fields.effortHours = 'Der Aufwand muss zwischen 0,25 und 200 Stunden liegen.';
    else values.effortHours = input.effortHours;
  }
  if (!patch) {
    if (own(input, 'groupId') && input.groupId !== null && (typeof input.groupId !== 'string' || !input.groupId.trim())) fields.groupId = 'Eine Gruppen-ID oder null ist erforderlich.';
    else values.groupId = input.groupId ?? null;
    values.status = 'open';
  } else if (own(input, 'status')) {
    if (!TASK_STATUSES.includes(input.status)) fields.status = 'Erlaubt sind open, in_progress und done.';
    else values.status = input.status;
  }
    if (Object.keys(fields).length) {
      const labels = { title: 'Titel', description: 'Beschreibung', dueAt: 'Fälligkeit', importance: 'Wichtigkeit', difficulty: 'Schwierigkeit', effortHours: 'Aufwand', groupId: 'Gruppe', status: 'Status', _form: 'Formular' };
      const invalidFields = Object.keys(fields).map(field => labels[field] || field).join(', ');
      throw new TaskError(400, 'VALIDATION_ERROR', `Bitte prüfe: ${invalidFields}.`, fields);
    }
  return values;
}

export function validateStatusFilter(status) {
  if (status !== undefined && !TASK_STATUSES.includes(status)) {
    throw new TaskError(400, 'VALIDATION_ERROR', 'Ungültiger Statusfilter.', { status: 'Erlaubt sind open, in_progress und done.' });
  }
  return status;
}
