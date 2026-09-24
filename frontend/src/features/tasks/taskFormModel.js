export const STATUS_LABELS = { open: 'Offen', in_progress: 'In Bearbeitung', done: 'Erledigt' };

export function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

export function initialTaskFields(task) {
  return {
    title: task?.title ?? '', description: task?.description ?? '', dueAt: toLocalInput(task?.dueAt),
    importance: String(task?.importance ?? 3), difficulty: String(task?.difficulty ?? 3),
    effortHours: String(task?.effortHours ?? 1), groupId: task?.groupId ?? '', status: task?.status ?? 'open'
  };
}

function localToIso(value) {
  if (!value) return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
  if (!parts) return null;
  const date = new Date(value);
  const expected = parts.slice(1, 7).map(value => Number(value ?? 0));
  const actual = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
  // Auch nicht existierende Ortszeiten beim Wechsel zur Sommerzeit ablehnen.
  if (!Number.isFinite(date.getTime()) || expected.some((part, index) => part !== actual[index])) return null;
  return date.toISOString();
}

export function prepareTaskPayload(values, original) {
  const fields = {};
  const title = values.title.trim();
  if (!title || title.length > 120) fields.title = 'Bitte einen Titel mit 1–120 Zeichen eingeben.';
  if (values.description.length > 2000) fields.description = 'Höchstens 2.000 Zeichen sind erlaubt.';
  const dueAt = original && values.dueAt === toLocalInput(original.dueAt) ? original.dueAt : localToIso(values.dueAt);
  if (!dueAt) fields.dueAt = 'Bitte einen gültigen Termin in deiner lokalen Zeitzone eingeben.';
  const importance = Number(values.importance), difficulty = Number(values.difficulty), effortHours = Number(values.effortHours);
  for (const [key, value] of [['importance', importance], ['difficulty', difficulty]]) {
    if (!Number.isInteger(value) || value < 1 || value > 5) fields[key] = 'Bitte eine ganze Zahl von 1 bis 5 wählen.';
  }
  if (!values.effortHours.trim() || !Number.isFinite(effortHours) || effortHours < 0.25 || effortHours > 200) fields.effortHours = 'Bitte 0,25–200 Stunden angeben.';
  const payload = { title, description: values.description, dueAt, importance, difficulty, effortHours };
  if (original) payload.status = values.status;
  else payload.groupId = values.groupId || null;
  return { payload, fields };
}
