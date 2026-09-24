import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthGate from '../../src/features/auth/AuthGate.jsx';
import { useAuth } from '../../src/features/auth/AuthContext.js';
import { api } from '../../src/api.js';
import TasksWorkspace from '@team-tasks/TasksWorkspace.jsx';

function Workspace() {
  const { user } = useAuth();
  return <><p data-testid="current-user">Arbeitsbereich für {user.email}</p><TasksWorkspace api={api} /></>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><AuthGate><Workspace /></AuthGate></React.StrictMode>);
