import { useCallback, useRef, useState } from 'react';
import TasksPage from './TasksPage.jsx';

// Liest Haizams veröffentlichte GET-/groups-Schnittstelle. Gruppen werden hier
// weder angelegt noch verwaltet; Anmeldung und Request-Header bleiben bei Jaouad.
export default function TasksWorkspace({ api, onSelectTask }) {
  const [groups, setGroups] = useState([]);
  const [groupError, setGroupError] = useState('');
  const latest = useRef(0);
  const refreshGroups = useCallback(async () => {
    const request = ++latest.current;
    try {
      const result = typeof api === 'function' ? await api('/groups') : await api.get('/groups');
      if (!Array.isArray(result)) throw new Error('Die Gruppen konnten nicht geladen werden.');
      if (request === latest.current) { setGroups(result); setGroupError(''); }
    } catch (error) {
      if (request === latest.current) { setGroups([]); setGroupError(error.message); }
    }
  }, [api]);
  return <div className="tasks-workspace">
    {groupError && <p role="alert" className="tasks-error">Gruppen konnten nicht geladen werden: {groupError} Persönliche Aufgaben bleiben nutzbar. Versuche „Aktualisieren“.</p>}
    <TasksPage api={api} groups={groups} onSelectTask={onSelectTask} refreshGroups={refreshGroups} />
  </div>;
}
