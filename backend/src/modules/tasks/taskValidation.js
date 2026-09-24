import { TaskError } from './taskError.js';

export const TASK_STATUSES = ['open', 'in_progress', 'done'];
const editable = ['title', 'description', 'dueAt', 'importance', 'difficulty', 'effortHours'];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// Date.parse allein akzeptiert z.B. den 30. Februar durch Überlauf in den März.
export function normalizeDueAt(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '0', , , , offsetHour = '0', offsetMinute = '0'] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1] ||
      Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 ||
      Number(offsetHour) > 23 || Number(offsetMinute) > 59) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  const date = new Date(milliseconds);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return null;
  return date.toISOString();
}

export function validateTaskInput(input, { patch = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TaskError(400, 'VALIDATION_ERROR', 'Bitte sende ein JSON-Objekt.');
  }
  const allowed = [...editable, patch ? 'status' : 'groupId'];
  const fields = Object.create(null);
  const values = {};
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) fields[key] = 'Dieses Feld darf nicht gesetzt oder geändert werden.';
  }
  if (patch && Object.keys(input).length === 0) fields._form = 'Mindestens ein Änderungsfeld ist erforderlich.';
  for (const field of ['title', 'dueAt', 'importance', 'difficulty', 'effortHours']) {
    if (!patch && !own(input, field)) fields[field] = 'Dieses Feld ist erforderlich.';
  }
  if (own(input, 'title')) {
    if (typeof input.title !== 'string' || input.title.trim().length < 1 || input.title.trim().length > 120) {
      fields.title = 'Der Titel muss nach dem Kürzen 1–120 Zeichen enthalten.';
    } else values.title = input.title.trim();
  }
  if (own(input, 'description')) {
    if (typeof input.description !== 'string' || input.description.length > 2000) fields.description = 'Die Beschreibung darf höchstens 2.000 Zeichen enthalten.';
    else values.description = input.description;
  } else if (!patch) values.description = '';
  if (own(input, 'dueAt')) {
    values.dueAt = normalizeDueAt(input.dueAt);
    if (!values.dueAt) fields.dueAt = 'Ein gültiger Zeitpunkt mit Zeitzone ist erforderlich.';
  }
  for (const field of ['importance', 'difficulty']) {
    if (!own(input, field)) continue;
    if (!Number.isInteger(input[field]) || input[field] < 1 || input[field] > 5) fields[field] = 'Bitte eine ganze Zahl von 1 bis 5 angeben.';
    else values[field] = input[field];
  }
  if (own(input, 'effortHours')) {
    if (typeof input.effortHours !== 'number' || !Number.isFinite(input.effortHours) || input.effortHours < 0.25 || input.effortHours > 200) {
      fields.effortHours = 'Der Aufwand muss zwischen 0,25 und 200 Stunden liegen.';
    } else values.effortHours = input.effortHours;
  }
  if (!patch) {
    if (own(input, 'groupId') && input.groupId !== null && (typeof input.groupId !== 'string' || !input.groupId.trim())) fields.groupId = 'Eine Gruppen-ID oder null ist erforderlich.';
    else values.groupId = input.groupId ?? null;
    values.status = 'open';
  } else if (own(input, 'status')) {
    if (!TASK_STATUSES.includes(input.status)) fields.status = 'Erlaubt sind open, in_progress und done.';
    else values.status = input.status;
  }
  if (Object.keys(fields).length) throw new TaskError(400, 'VALIDATION_ERROR', 'Bitte prüfe die Eingaben.', fields);
  return values;
}

export function validateStatusFilter(status) {
  if (status !== undefined && !TASK_STATUSES.includes(status)) {
    throw new TaskError(400, 'VALIDATION_ERROR', 'Ungültiger Statusfilter.', { status: 'Erlaubt sind open, in_progress und done.' });
  }
  return status;
}
