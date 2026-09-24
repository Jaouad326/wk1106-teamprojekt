import { useAuth } from '../auth/AuthContext.js';
import GroupsPage from '../groups/GroupsPage.jsx';
import './dashboard.css';

const overviewItems = [
  { label: 'Aufgaben', value: 'Ausstehend', detail: 'Das Aufgabenmodul ist noch nicht in main integriert.' },
  { label: 'Prioritäten', value: 'Ausstehend', detail: 'Die Prioritätsansicht folgt mit dem Aufgabenmodul.' },
  { label: 'Gruppen', value: 'Verfügbar', detail: 'Gruppen können im Bereich unten verwaltet werden.' }
];

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>StudyPrio</span>
        </div>
        <div className="dashboard-account">
          <span>{user.email}</span>
          <button type="button" onClick={logout}>Abmelden</button>
        </div>
      </header>

      <section className="dashboard-welcome">
        <p className="dashboard-eyebrow">ÜBERSICHT</p>
        <h1>Dein Arbeitsbereich</h1>
        <p>Ein klarer Einstieg für deine Aufgaben, Prioritäten und Gruppen.</p>
      </section>

      <section className="dashboard-grid" aria-label="StudyPrio Übersicht">
        {overviewItems.map((item) => (
          <article className="dashboard-panel" key={item.label}>
            <p className="panel-label">{item.label}</p>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-next">
        <div>
          <p className="dashboard-eyebrow">NÄCHSTER SCHRITT</p>
          <h2>Bereit für deine Planung?</h2>
          <p>Gruppen sind bereits verfügbar. Aufgaben und Prioritäten folgen, sobald ihre Module in main integriert sind.</p>
        </div>
        <span className="dashboard-mark" aria-hidden="true">+</span>
      </section>
      <GroupsPage />
    </main>
  );
}
