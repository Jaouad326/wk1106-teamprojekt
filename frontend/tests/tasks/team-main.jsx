import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthGate from '@team-auth/features/auth/AuthGate.jsx';
import { api } from '@team-auth/api.js';
import TasksWorkspace from '../../src/features/tasks/TasksWorkspace.jsx';

// @team-auth zeigt ausschließlich im Prüfstart auf Jaouads unveränderten Checkout.
createRoot(document.getElementById('root')).render(<React.StrictMode>
  <AuthGate><TasksWorkspace api={api} /></AuthGate>
</React.StrictMode>);
