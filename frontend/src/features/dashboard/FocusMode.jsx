import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide-react';

const STORAGE_KEY = 'studyprio:focus-mode';
const validMinutes = (value, max) => Number.isInteger(value) && value >= 1 && value <= max;
function initialState() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { /* Mit Standardwerten starten. */ }
  const focusMinutes = validMinutes(saved.focusMinutes, 180) ? saved.focusMinutes : 25;
  const breakMinutes = validMinutes(saved.breakMinutes, 60) ? saved.breakMinutes : 5;
  const mode = saved.mode === 'break' ? 'break' : 'focus';
  const total = (mode === 'focus' ? focusMinutes : breakMinutes) * 60;
  return { mode, focusMinutes, breakMinutes,
    remaining: Number.isInteger(saved.remaining) && saved.remaining > 0 && saved.remaining <= total ? saved.remaining : total,
    completed: Number.isInteger(saved.completed) && saved.completed >= 0 ? saved.completed : 0,
    selectedTaskId: typeof saved.selectedTaskId === 'string' ? saved.selectedTaskId : '' };
}
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }

export default function FocusMode({ tasks = [] }) {
  const [state, setState] = useState(initialState);
  const [running, setRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusInput, setFocusInput] = useState(String(state.focusMinutes));
  const [breakInput, setBreakInput] = useState(String(state.breakMinutes));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const deadline = useRef(null);
  const selectedTask = tasks.find(task => task.id === state.selectedTaskId);
  const total = (state.mode === 'focus' ? state.focusMinutes : state.breakMinutes) * 60;
  const progress = (1 - state.remaining / total) * 100;
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      if (remaining > 0) setState(current => current.remaining === remaining ? current : { ...current, remaining });
      else {
        setRunning(false);
        setMessage('Phase abgeschlossen. Starte die nächste Phase, wenn du bereit bist.');
        setState(current => current.mode === 'focus'
          ? { ...current, mode: 'break', remaining: current.breakMinutes * 60, completed: current.completed + 1 }
          : { ...current, mode: 'focus', remaining: current.focusMinutes * 60 });
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [running]);
  function toggleRunning() {
    setMessage('');
    if (!running) deadline.current = Date.now() + state.remaining * 1000;
    setRunning(value => !value);
  }
  function reset() {
    setRunning(false); setMessage('');
    setState(current => ({ ...current, mode: 'focus', remaining: current.focusMinutes * 60 }));
  }
  function applySettings(event) {
    event.preventDefault();
    const focusMinutes = Number(focusInput), breakMinutes = Number(breakInput);
    if (!validMinutes(focusMinutes, 180) || !validMinutes(breakMinutes, 60)) {
      setError('Lernzeit: 1–180 Minuten. Pause: 1–60 Minuten. Bitte ganze Minuten angeben.'); return;
    }
    setRunning(false); setError(''); setSettingsOpen(false); setMessage('Deine Zeiten wurden gespeichert.');
    setState(current => ({ ...current, mode: 'focus', focusMinutes, breakMinutes, remaining: focusMinutes * 60 }));
  }
  return <section className="focus-mode" aria-label="Fokusmodus">
    <div className="focus-mode-copy">
      <p className="dashboard-eyebrow">DEIN LERNRHYTHMUS</p><h2>Jetzt lernen</h2>
      <p>Deine Lernzeit, dein Tempo. Nach jeder Phase wartet der Timer auf deinen Start.</p>
      <label className="focus-task-select">Aufgabe<select value={state.selectedTaskId} onChange={event => setState(current => ({ ...current, selectedTaskId: event.target.value }))}>
        <option value="">Ohne bestimmte Aufgabe</option>
        {tasks.filter(task => task.status !== 'done').map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
      </select></label>
      {selectedTask?.priority && <span className="focus-priority priority-badge">{selectedTask.priority.label}</span>}
      <button type="button" className="focus-settings-toggle ui-button ui-button-secondary" aria-expanded={settingsOpen}
        onClick={() => { setFocusInput(String(state.focusMinutes)); setBreakInput(String(state.breakMinutes)); setError(''); setSettingsOpen(value => !value); }}>
        <SlidersHorizontal size={16} aria-hidden="true" /> Zeiten anpassen <span>{state.focusMinutes} / {state.breakMinutes} Min.</span>
      </button>
      {settingsOpen && <form className="focus-settings" onSubmit={applySettings}>
        <div className="focus-presets" aria-label="Zeitvorschläge">{[[25, 5], [50, 10], [90, 15]].map(([focus, pause]) => <button type="button" key={focus}
          aria-pressed={Number(focusInput) === focus && Number(breakInput) === pause}
          onClick={() => { setFocusInput(String(focus)); setBreakInput(String(pause)); }}>{focus} / {pause}</button>)}</div>
        <div className="focus-duration-fields"><label>Lernzeit (Min.)<input type="number" min="1" max="180" step="1" required value={focusInput} onChange={e => setFocusInput(e.target.value)} /></label>
          <label>Pause (Min.)<input type="number" min="1" max="60" step="1" required value={breakInput} onChange={e => setBreakInput(e.target.value)} /></label></div>
        <p>Übernehmen pausiert den Timer und startet die Lernzeit neu.</p>
        {error && <p role="alert">{error}</p>}
        <button className="ui-button" type="submit">Zeiten übernehmen</button>
      </form>}
      {message && <p className="focus-feedback" role="status">{message}</p>}
    </div>
    <div className="focus-mode-timer">
      <div className="focus-clock" style={{ '--focus-progress': `${progress}%` }}><div>
        <span className="focus-mode-label">{state.mode === 'focus' ? 'Lernphase' : 'Pause'}</span>
        <strong aria-label="Verbleibende Zeit">{formatTime(state.remaining)}</strong>
        <span className="focus-mode-count">{running ? 'Du bist im Fokus' : 'Bereit, wenn du es bist'}</span>
      </div></div>
      <span className="focus-mode-count">{state.completed} Lernphase{state.completed === 1 ? '' : 'n'} abgeschlossen</span>
      <div className="focus-mode-actions"><button type="button" onClick={toggleRunning}>
        {running ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}{running ? 'Pausieren' : 'Starten'}</button>
        <button type="button" className="focus-reset" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Zurücksetzen</button></div>
    </div>
  </section>;
}
