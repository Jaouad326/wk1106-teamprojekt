import { useEffect, useRef, useState } from 'react';
import { LogOut, Send, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { inviteGroupMember, createGroup, getGroupMembers, getGroups, leaveGroup, removeGroupMember } from './groupsApi.js';
import './groups.css';

export default function GroupsPage({ onGroupsChange, refreshKey, onMembershipChange }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [successorId, setSuccessorId] = useState('');
  const latestSelection = useRef(0);
  const isOwner = selectedGroup?.ownerId === user.id;
  const otherMembers = members.filter(member => member.userId !== user.id);

  useEffect(() => {
    let active = true;
    getGroups().then(list => { if (active) setGroups(list); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);
  useEffect(() => { onGroupsChange?.(groups); }, [groups, onGroupsChange]);

  async function selectGroup(group) {
    const selection = ++latestSelection.current;
    setSelectedGroup(group); setMembers([]); setMembersLoading(true); setError(''); setMessage('');
    try {
      const list = await getGroupMembers(group.id);
      if (selection === latestSelection.current) setMembers(list);
    } catch (err) { if (selection === latestSelection.current) setError(err.message); }
    finally { if (selection === latestSelection.current) setMembersLoading(false); }
  }
  async function handleCreate(event) {
    event.preventDefault(); if (!groupName.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const group = await createGroup(groupName);
      setGroups(current => [...current, group]); setGroupName(''); await selectGroup(group);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function handleInvite(event) {
    event.preventDefault(); if (!selectedGroup || !memberEmail.trim() || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await inviteGroupMember(selectedGroup.id, memberEmail);
      setMessage(`Einladung an ${memberEmail.trim()} gesendet. Sie erscheint bei der Person unter „Gruppeneinladungen“.`);
      setMemberEmail('');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function handleRemoveMember(userId) {
    if (!selectedGroup || busy) return;
    setBusy(true); setError('');
    try { await removeGroupMember(selectedGroup.id, userId); setMembers(await getGroupMembers(selectedGroup.id)); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function handleLeave() {
    if (!selectedGroup || busy) return;
    setBusy(true); setLeaveError('');
    try {
      const result = await leaveGroup(selectedGroup.id, successorId || undefined);
      setGroups(current => current.filter(group => group.id !== selectedGroup.id));
      ++latestSelection.current; setSelectedGroup(null); setMembers([]); setLeaveOpen(false);
      setMessage(result.dissolved ? 'Gruppe aufgelöst. Die Aufgaben bleiben als persönliche Aufgaben erhalten.' : 'Du hast die Gruppe verlassen.');
      onMembershipChange?.();
    } catch (err) { setLeaveError(err.message); } finally { setBusy(false); }
  }
  if (loading) return <section className="groups-panel"><p>Gruppen werden geladen …</p></section>;
  return <section className="groups-panel" aria-label="Gruppenverwaltung">
    <div className="groups-heading"><div><p className="dashboard-eyebrow">ZUSAMMENARBEIT</p><h2>Meine Gruppen</h2></div><span className="groups-count">{groups.length}</span></div>
    {error && <p className="groups-error" role="alert">{error}</p>}
    {message && <p className="groups-message" role="status">{message}</p>}
    <form className="group-create" onSubmit={handleCreate}>
      <input aria-label="Neue Gruppe" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Neue Gruppe" maxLength={80} />
      <button type="submit" disabled={busy || !groupName.trim()}>Erstellen</button>
    </form>
    {!groups.length ? <p className="groups-empty">Noch keine Gruppen. Erstelle deine erste Lerngruppe.</p> : <div className="groups-content">
      <div className="groups-list">{groups.map(group => <button key={group.id} disabled={busy} type="button"
        className={`group-item${selectedGroup?.id === group.id ? ' is-selected' : ''}`} onClick={() => selectGroup(group)}>
        <span><Users size={16} aria-hidden="true" /> {group.name}</span><span aria-hidden="true">›</span>
      </button>)}</div>
      {selectedGroup && <div className="group-details">
        <div className="group-details-heading"><h3>{selectedGroup.name}</h3><span className="group-role">{isOwner ? 'Gruppenleitung' : 'Mitglied'}</span></div>
        {membersLoading ? <p>Mitglieder werden geladen …</p> : <ul>{members.map(member => <li key={member.userId}>
          <span><strong className="user-identity" title={member.email || 'E-Mail unbekannt'}>{member.displayName || member.email || member.userId}</strong>{member.userId === selectedGroup.ownerId && <small> · Leitung</small>}</span>
          {isOwner && member.userId !== user.id && <button type="button" disabled={busy} onClick={() => handleRemoveMember(member.userId)}>Entfernen</button>}
        </li>)}</ul>}
        {isOwner && <form onSubmit={handleInvite}>
          <input type="email" aria-label="E-Mail-Adresse einladen" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="Hochschul-E-Mail" required />
          <button type="submit" disabled={busy || !memberEmail.trim()}><Send size={15} aria-hidden="true" /> Einladen</button>
        </form>}
        {isOwner && <p className="group-hint">Die Person braucht ein bestätigtes Konto und entscheidet selbst, ob sie beitritt.</p>}
        <div className="group-footer"><button className="ui-button ui-button-secondary group-leave" type="button"
          disabled={busy || membersLoading || !members.some(member => member.userId === user.id)}
          onClick={() => { setSuccessorId(otherMembers[0]?.userId || ''); setLeaveError(''); setLeaveOpen(true); }}>
          <LogOut size={16} aria-hidden="true" /> Gruppe verlassen
        </button></div>
      </div>}
    </div>}
    {leaveOpen && selectedGroup && <ConfirmDialog title="Gruppe verlassen?" confirmLabel="Verlassen bestätigen"
      onCancel={() => setLeaveOpen(false)} onConfirm={handleLeave} busy={busy} error={leaveError}>
      {isOwner && otherMembers.length ? <><p>Wähle, wer die Leitung von „{selectedGroup.name}“ übernimmt. Danach hast du keinen Zugriff mehr auf ihre Gruppenaufgaben.</p>
        <label>Neue Gruppenleitung<select value={successorId} onChange={e => setSuccessorId(e.target.value)}>
          {otherMembers.map(member => <option key={member.userId} value={member.userId}>{member.displayName || member.email || member.userId}</option>)}
        </select></label></> : isOwner ? <p>Du bist das letzte Mitglied. „{selectedGroup.name}“ wird aufgelöst. Die Aufgaben und Kommentare bleiben bei dir als persönliche Aufgaben erhalten. Offene Einladungen verfallen.</p>
        : <p>Du verlässt „{selectedGroup.name}“ und verlierst den Zugriff auf ihre Gruppenaufgaben. Deine persönlichen Aufgaben bleiben erhalten.</p>}
    </ConfirmDialog>}
  </section>;
}
