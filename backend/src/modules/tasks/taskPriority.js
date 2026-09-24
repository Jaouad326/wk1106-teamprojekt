const URGENT_DAYS = 1;
const SOON_DAYS = 3;
const UPCOMING_DAYS = 7;
const MAX_EFFORT_PENALTY_HOURS = 20;

// Kombiniert Wichtigkeit, Dringlichkeit (Termin) und Schwierigkeit zu einem Score.
// Höherer Aufwand senkt den Score leicht, da große Aufgaben früh begonnen werden sollten,
// aber nicht automatisch die dringendste Einzelaufgabe sind.
export function calculateTaskPriority(task, now = new Date()) {
  if (task.status === 'done') return { score: 0, label: 'Erledigt', overdue: false };

  const daysUntilDue = (new Date(task.dueAt).getTime() - now.getTime()) / 86_400_000;
  const overdue = daysUntilDue < 0;
  const urgency = overdue ? 5
    : daysUntilDue <= URGENT_DAYS ? 4
    : daysUntilDue <= SOON_DAYS ? 3
    : daysUntilDue <= UPCOMING_DAYS ? 2
    : 1;

  const effortPenalty = Math.min(task.effortHours, MAX_EFFORT_PENALTY_HOURS) / 10;
  const score = Math.round((task.importance * 2 + urgency * 2 + task.difficulty - effortPenalty) * 10) / 10;

  const label = score >= 16 ? 'Sehr hoch' : score >= 11 ? 'Hoch' : score >= 7 ? 'Mittel' : 'Niedrig';
  return { score, label, overdue };
}
