// Ausschließlich lokale Testoberfläche. Die Produktivansicht erhält Jaouads api.
import React from 'react';
import { createRoot } from 'react-dom/client';
import TasksPage from '../../src/features/tasks/TasksPage.jsx';

async function testApi(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error.message), { status: response.status, ...result.error });
  return result.data;
}
document.body.style.margin = '0';
createRoot(document.getElementById('root')).render(<React.StrictMode>
  <p style={{ margin: '16px', fontFamily: 'system-ui', fontSize: '13px' }}>Lokale Testansicht · erfundene Konten · keine echte Anmeldung</p>
  <TasksPage api={testApi} groups={[{ id: 'study-group', name: 'Lerngruppe' }]} />
</React.StrictMode>);
