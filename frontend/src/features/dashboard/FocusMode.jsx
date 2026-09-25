import { useEffect, useState } from 'react';

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;
const STORAGE_KEY = 'studyprio:focus-mode';

function initialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      mode: saved.mode === 'break' ? 'break' : 'focus',
      remaining: Number.isInteger(saved.remaining) ? saved.remaining : FOCUS_MINUTES * 60,
      completed: Number.isInteger(saved.completed) ? saved.completed : 0,
      selectedTaskId: saved.selectedTaskId || ''
    };
  } catch {
    return { mode: 'focus', remaining: FOCUS_MINUTES * 60, completed: 0, selectedTaskId: '' };
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

export default function FocusMode({ tasks = [] }) {
  const [state, setState] = useState(initialState);
  const [running, setRunning] = useState(false);
  const selectedTask = tasks.find(task => task.id === state.selectedTaskId);
  const availableTasks = tasks.filter(task => task.status !== 'done');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setState(current => {
        if (current.remaining > 1) return { ...current, remaining: current.remaining - 1 };
        if (current.mode === 'focus') {
          return { ...current, mode: 'break', remaining: BREAK_MINUTES * 60, completed: current.completed + 1 };
        }
        return { ...current, mode: 'focus', remaining: FOCUS_MINUTES * 60 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  function reset() {
    setRunning(false);
    setState(current => ({ ...current, mode: 'focus', remaining: FOCUS_MINUTES * 60 }));
  }

  return (
    <section className="focus-mode" aria-label="Fokusmodus">
      <div className="focus-mode-copy">
        <p className="dashboard-eyebrow">FOKUSMODUS</p>
        <h2>Jetzt lernen</h2>
        <p>Eine konzentrierte Lernphase, danach eine kurze Pause.</p>
        <label className="focus-task-select">
          Aufgabe
          <select value={state.selectedTaskId} onChange={event => setState(current => ({ ...current, selectedTaskId: event.target.value }))}>
            <option value="">Aufgabe auswählen</option>
            {availableTasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
        </label>
        {selectedTask && <span className={`focus-priority priority-badge priority-${selectedTask.priority.label.toLowerCase().replace(' ', '-')}`}>{selectedTask.priority.label}</span>}
      </div>
      <div className="focus-mode-timer">
        <span className="focus-mode-label">{state.mode === 'focus' ? 'Lernphase' : 'Pause'}</span>
        <strong>{formatTime(state.remaining)}</strong>
        <span className="focus-mode-count">{state.completed} Lernphase{state.completed === 1 ? '' : 'n'} abgeschlossen</span>
        <div className="focus-mode-actions">
          <button type="button" onClick={() => setRunning(value => !value)}>{running ? 'Pausieren' : 'Starten'}</button>
          <button type="button" className="focus-reset" onClick={reset}>Zurücksetzen</button>
        </div>
      </div>
    </section>
  );
}
