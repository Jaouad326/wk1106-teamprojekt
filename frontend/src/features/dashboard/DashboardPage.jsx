import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import {
  getGroupInvitations,
  acceptGroupInvitation,
  declineGroupInvitation
} from '../groups/groupsApi.js';
import { useAuth } from '../auth/AuthContext.js';
import { ChevronLeft, ChevronRight, ClipboardCheck, LayoutGrid, LogOut, Users } from 'lucide-react';
import FocusMode from './FocusMode.jsx';
import GroupsPage from '../groups/GroupsPage.jsx';
import TasksPage from '../tasks/TasksPage.jsx';
import './dashboard.css';

const EMPTY_GROUPS = [];
const PRIORITY_CLASSES = {
  'Sehr hoch': 'priority-sehr-hoch',
  Hoch: 'priority-hoch',
  Mittel: 'priority-mittel',
  Niedrig: 'priority-niedrig'
};
const STATUS_ACTIVITY_LABELS = { open: 'angelegt', in_progress: 'in Arbeit', done: 'erledigt' };

// Kurze, menschenlesbare Frist statt eines exakten Datums, passend zum Übersichts-Mockup.
function formatDueLabel(dueAt) {
  const due = new Date(dueAt);
  const now = new Date();
  const days = Math.round((new Date(due.toDateString()) - new Date(now.toDateString())) / 86_400_000);
  if (days < 0) return 'überfällig';
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days < 7) return due.toLocaleDateString('de-DE', { weekday: 'long' });
  return 'nächste Woche';
}

// Grobe, aber ehrliche Zeitangabe relativ zu jetzt statt eines exakten Zeitstempels.
function formatRelativeTime(isoString) {
  const diffMinutes = Math.round((Date.now() - new Date(isoString).getTime()) / 60_000);
  if (diffMinutes < 1) return 'gerade eben';
  if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  const diffDays = Math.round(diffHours / 24);
  return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [taskSummary, setTaskSummary] = useState(null);
  const [groups, setGroups] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user.displayName || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [invitations, setInvitations] = useState([]);
const [invitationsOpen, setInvitationsOpen] = useState(false);
const [invitationError, setInvitationError] = useState('');
const [invitationBusy, setInvitationBusy] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('studyprio:dark-mode') === 'true');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('studyprio:sidebar-collapsed') === 'true');
  const handleTaskSummary = useCallback(summary => setTaskSummary(summary), []);
  const handleGroups = useCallback(list => setGroups(list), []);
  const groupCount = groups === null ? null : groups.length;
  const progressPercent = taskSummary && taskSummary.total > 0
    ? Math.round((taskSummary.done / taskSummary.total) * 100) : 0;

  useEffect(() => {
    localStorage.setItem('studyprio:dark-mode', String(darkMode));
  }, [darkMode]);
  async function loadInvitations() {
  try {
    setInvitationError('');
    const data = await getGroupInvitations();
    setInvitations(data);
  } catch (error) {
    setInvitations([]);
    setInvitationError('Keine Benachrichtigungen vorhanden.');
  }
}useEffect(() => {
  loadInvitations();
}, []);
async function respondToInvitation(invitationId, action) {
  if (invitationBusy) return;

  setInvitationBusy(true);
  setInvitationError('');

  try {
    if (action === 'accept') {
      await acceptGroupInvitation(invitationId);
    } else {
      await declineGroupInvitation(invitationId);
    }

    await loadInvitations();
  } catch (error) {
    setInvitationError(error.message);
  } finally {
    setInvitationBusy(false);
  }
}

  useEffect(() => {
    localStorage.setItem('studyprio:sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  async function saveProfile(event) {
    event.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true); setProfileError('');
    try {
      const updatedUser = await api('/auth/profile', { method: 'PATCH', body: { displayName: profileName } });
      setProfileName(updatedUser.displayName || '');
      setProfileOpen(false);
    } catch (error) { setProfileError(error.message); }
    finally { setProfileSaving(false); }
  }

  const visibleName = profileName || user.email.split('@')[0];

  const overviewItems = [
    {
      label: 'Aufgaben',
      value: taskSummary === null ? '…' : `${taskSummary.open} offen`,
      detail: taskSummary === null ? 'Wird geladen ...'
        : taskSummary.total === 0 ? 'Noch keine Aufgaben. Erstelle deine erste Aufgabe.'
        : `${taskSummary.total} insgesamt, davon ${taskSummary.overdue} überfällig.`
    },
    {
      label: 'Heute fällig',
      value: taskSummary === null ? '…' : String(taskSummary.dueToday),
      detail: 'Aufgaben mit Frist heute.'
    },
    {
      label: 'Erledigt',
      value: taskSummary === null ? '…' : String(taskSummary.done),
      detail: 'Bereits abgeschlossene Aufgaben.'
    },
    {
      label: 'Gruppen',
      value: groupCount === null ? '…' : String(groupCount),
      detail: groupCount === 0 ? 'Noch keine Gruppen. Erstelle deine erste Gruppe.' : 'Aktuell verwaltete Gruppen.'
    }
  ];
  

  return (
    <main className={`dashboard-page${darkMode ? ' is-dark' : ''}${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand"><span className="brand-mark" aria-hidden="true">S</span><span className="dashboard-sidebar-label">StudyPrio</span></div>
        <button className="sidebar-toggle" type="button" onClick={() => setSidebarCollapsed(value => !value)}
          aria-label={sidebarCollapsed ? 'Sidebar öffnen' : 'Sidebar einklappen'} title={sidebarCollapsed ? 'Sidebar öffnen' : 'Sidebar einklappen'}>
          {sidebarCollapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
        </button>
        <nav className="dashboard-nav" aria-label="Bereiche">
          <a className="is-active" href="#overview" title="Übersicht"><LayoutGrid aria-hidden="true" /><span className="dashboard-sidebar-label">Übersicht</span></a>
          <a href="#groups" title="Gruppen"><Users aria-hidden="true" /><span className="dashboard-sidebar-label">Gruppen</span></a>
          <a href="#tasks" title="Aufgaben"><ClipboardCheck aria-hidden="true" /><span className="dashboard-sidebar-label">Aufgaben</span></a>
        </nav>
        <div className="dashboard-account">
          <div className="profile-summary">
            <span className="profile-avatar" aria-hidden="true"><span /></span>
            <span className="dashboard-sidebar-label"><strong>{visibleName}</strong><small>{user.email}</small></span>
          </div>
          <button type="button" onClick={logout}><LogOut aria-hidden="true" /><span className="dashboard-sidebar-label">Abmelden</span></button>
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <nav className="dashboard-topnav" aria-label="Hauptnavigation">
          <div className="invitation-notifications">
  <button
    type="button"
    className="notification-button"
    aria-label="Gruppeneinladungen"
    aria-expanded={invitationsOpen}
    onClick={() => setInvitationsOpen(open => !open)}
  >
    🔔
    {invitations.length > 0 && (
      <span className="notification-badge">
        {invitations.length}
      </span>
    )}
  </button>

  {invitationsOpen && (
    <div className="invitation-panel">
      <div className="settings-heading">
        <div>
          <p className="dashboard-eyebrow">EINLADUNGEN</p>
          <h2>Gruppeneinladungen</h2>
        </div>

        <button
          className="settings-close"
          type="button"
          onClick={() => setInvitationsOpen(false)}
          aria-label="Einladungen schließen"
        >
          ×
        </button>
      </div>

      {invitations.length === 0 ? (
        <p className="dashboard-empty">
          {invitationError || 'Keine Benachrichtigungen vorhanden.'}
        </p>
      ) : (
        <ul className="invitation-list">
          {invitations.map(invitation => (
            <li key={invitation.id} className="invitation-item">
              <div>
                <strong>{invitation.groupName}</strong>
                <p>Du wurdest zu dieser Gruppe eingeladen.</p>
              </div>

              <div className="invitation-actions">
                <button
                  type="button"
                  disabled={invitationBusy}
                  onClick={() =>
                    respondToInvitation(invitation.id, 'accept')
                  }
                >
                  Annehmen
                </button>

                <button
                  type="button"
                  disabled={invitationBusy}
                  onClick={() =>
                    respondToInvitation(invitation.id, 'decline')
                  }
                >
                  Ablehnen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )}
</div>
            <a className="is-active" href="#overview">Home</a>
            <button type="button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(open => !open)}>Einstellungen</button>
            <button type="button" aria-expanded={profileOpen} onClick={() => { setProfileOpen(open => !open); setSettingsOpen(false); }}>Profil bearbeiten</button>
            <button type="button" onClick={logout}>Logout</button>
          </nav>
          {settingsOpen && (
            <section className="settings-panel" aria-label="Einstellungen">
              <div className="settings-heading">
                <div><p className="dashboard-eyebrow">DARSTELLUNG</p><h2>Einstellungen</h2></div>
                <button className="settings-close" type="button" onClick={() => setSettingsOpen(false)} aria-label="Einstellungen schließen">×</button>
              </div>
              <label className="settings-option">
                <span><strong>Dark Mode</strong><small>Schwarzer Hintergrund für konzentriertes Arbeiten.</small></span>
                <input type="checkbox" checked={darkMode} onChange={event => setDarkMode(event.target.checked)} />
              </label>
            </section>
          )}
          {profileOpen && (
            <section className="profile-panel" aria-label="Profil bearbeiten">
              <div className="settings-heading">
                <div><p className="dashboard-eyebrow">MEIN PROFIL</p><h2>Profil bearbeiten</h2></div>
                <button className="settings-close" type="button" onClick={() => setProfileOpen(false)} aria-label="Profil schließen">×</button>
              </div>
              {profileError && <p className="profile-error" role="alert">{profileError}</p>}
              <form className="profile-form" onSubmit={saveProfile}>
                <label htmlFor="profile-name">Anzeigename</label>
                <input id="profile-name" value={profileName} maxLength={80} onChange={event => setProfileName(event.target.value)} placeholder="Dein Name" />
                <p>{user.email}</p>
                <button type="submit" disabled={profileSaving}>{profileSaving ? 'Wird gespeichert ...' : 'Profil speichern'}</button>
              </form>
            </section>
          )}
        </header>

        <section className="dashboard-welcome" id="overview">
          <p className="dashboard-eyebrow">ÜBERSICHT</p>
          <h1>Dein Arbeitsbereich</h1>
          <p>Aufgaben planen, Prioritäten setzen und gemeinsam organisiert bleiben.</p>
        </section>

        <section className="dashboard-overview" aria-label="StudyPrio Übersicht">
          {overviewItems.map((item) => <div className="dashboard-overview-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></div>)}
        </section>

        <section className="dashboard-progress" aria-label="Gesamtfortschritt">
          <div className="dashboard-progress-heading">
            <p className="dashboard-eyebrow">GESAMTFORTSCHRITT</p>
            <strong>{taskSummary === null ? '…' : `${progressPercent}%`}</strong>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="dashboard-progress-detail">
            {taskSummary === null ? 'Wird geladen ...'
              : taskSummary.total === 0 ? 'Noch keine Aufgaben zur Auswertung vorhanden.'
              : `${taskSummary.done} von ${taskSummary.total} Aufgaben erledigt.`}
          </p>
        </section>

        <FocusMode tasks={taskSummary?.topTasks || []} />

        <section className="dashboard-highlights" aria-label="Wichtigste Aufgaben">
          <p className="dashboard-eyebrow">WICHTIGSTE AUFGABEN</p>
          {taskSummary === null ? <p className="dashboard-empty">Wird geladen ...</p>
            : taskSummary.topTasks.length === 0 ? <p className="dashboard-empty">Keine offenen Aufgaben. Gut gemacht!</p>
            : <ul className="dashboard-highlight-list">
              {taskSummary.topTasks.map(task => (
                <li key={task.id}>
                  <span className={`dashboard-highlight-dot ${PRIORITY_CLASSES[task.priority.label] ?? 'priority-erledigt'}`} aria-hidden="true" />
                  <span className="dashboard-highlight-title">{task.title}</span>
                  <span className="dashboard-highlight-due">{formatDueLabel(task.dueAt)}</span>
                </li>
              ))}
            </ul>}
        </section>

        <div className="dashboard-split">
          {taskSummary && taskSummary.byGroup.length > 0 && (
            <section className="dashboard-group-progress" aria-label="Fortschritt je Gruppe">
              <p className="dashboard-eyebrow">FORTSCHRITT JE GRUPPE</p>
              <ul className="group-progress-list">
                {taskSummary.byGroup.map(group => {
                  const percent = group.total > 0 ? Math.round((group.done / group.total) * 100) : 0;
                  return (
                    <li key={group.id}>
                      <div className="group-progress-heading"><span>{group.name}</span><span>{group.done}/{group.total}</span></div>
                      <div className="progress-track progress-track--small">
                        <div className="progress-fill" style={{ width: `${percent}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {taskSummary && taskSummary.recentActivity.length > 0 && (
            <section className="dashboard-activity" aria-label="Letzte Aktivität">
              <p className="dashboard-eyebrow">LETZTE AKTIVITÄT</p>
              <ul className="activity-list">
                {taskSummary.recentActivity.map(task => (
                  <li key={task.id}>
                    <span className="activity-dot" aria-hidden="true" />
                    <span className="activity-text"><strong>{task.title}</strong> {STATUS_ACTIVITY_LABELS[task.status]}</span>
                    <span className="activity-time">{formatRelativeTime(task.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {groups && groups.length > 0 && (
          <section className="dashboard-groups-chips" aria-label="Gruppen">
            <p className="dashboard-eyebrow">GRUPPEN</p>
            <div className="dashboard-chip-row">
              {groups.map(group => <span className="dashboard-chip" key={group.id}>{group.name}</span>)}
            </div>
          </section>
        )}

        <section className="dashboard-next"><div><p className="dashboard-eyebrow">ARBEITSBEREICH</p><h2>Alles an einem Ort.</h2></div></section>
        <section id="groups"><GroupsPage onGroupsChange={handleGroups} /></section>
        <section id="tasks"><TasksPage onSummaryChange={handleTaskSummary} groups={groups ?? EMPTY_GROUPS} /></section>
      </div>
    </main>
  );
}
