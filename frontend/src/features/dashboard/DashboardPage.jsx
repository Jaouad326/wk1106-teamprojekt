import { useCallback, useState } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import GroupsPage from '../groups/GroupsPage.jsx';
import TasksPage from '../tasks/TasksPage.jsx';
import './dashboard.css';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [taskSummary, setTaskSummary] = useState(null);
  const [groupCount, setGroupCount] = useState(null);
  const handleTaskSummary = useCallback(summary => setTaskSummary(summary), []);
  const handleGroups = useCallback(groups => setGroupCount(groups.length), []);

  const overviewItems = [
    {
      label: 'Aufgaben',
      value: taskSummary === null ? '…' : `${taskSummary.open} offen`,
      detail: taskSummary === null ? 'Wird geladen ...'
        : taskSummary.total === 0 ? 'Noch keine Aufgaben. Erstelle deine erste Aufgabe.'
        : `${taskSummary.total} insgesamt, davon ${taskSummary.overdue} überfällig.`
    },
    {
      label: 'Nächste Aufgabe',
      value: taskSummary?.next ? taskSummary.next.title : '—',
      detail: taskSummary?.next ? `Priorität: ${taskSummary.next.priority.label}` : 'Keine offene Aufgabe vorhanden.'
    },
    {
      label: 'Gruppen',
      value: groupCount === null ? '…' : String(groupCount),
      detail: groupCount === 0 ? 'Noch keine Gruppen. Erstelle deine erste Gruppe.' : 'Aktuell verwaltete Gruppen.'
    }
  ];

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand"><span className="brand-mark" aria-hidden="true">S</span><span>StudyPrio</span></div>
        <nav className="dashboard-nav" aria-label="Bereiche">
          <a className="is-active" href="#overview">Übersicht</a>
          <a href="#tasks">Aufgaben</a>
          <a href="#groups">Gruppen</a>
        </nav>
        <div className="dashboard-account"><span>{user.email}</span><button type="button" onClick={logout}>Abmelden</button></div>
      </aside>

      <div className="dashboard-content">
        <section className="dashboard-welcome" id="overview">
          <p className="dashboard-eyebrow">ÜBERSICHT</p>
          <h1>Dein Arbeitsbereich</h1>
          <p>Aufgaben planen, Prioritäten setzen und gemeinsam organisiert bleiben.</p>
        </section>

        <section className="dashboard-overview" aria-label="StudyPrio Übersicht">
          {overviewItems.map((item) => <div className="dashboard-overview-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></div>)}
        </section>

        <section className="dashboard-next"><div><p className="dashboard-eyebrow">ARBEITSBEREICH</p><h2>Alles an einem Ort.</h2></div></section>
        <section id="groups"><GroupsPage onGroupsChange={handleGroups} /></section>
        <section id="tasks"><TasksPage onSummaryChange={handleTaskSummary} /></section>
      </div>
    </main>
  );
}
