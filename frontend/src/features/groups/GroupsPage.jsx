import { useEffect, useState } from 'react';
import {
  addGroupMember,
  createGroup,
  getGroupMembers,
  getGroups,
  removeGroupMember
} from './groupsApi.js';
import './groups.css';

export default function GroupsPage({ onGroupsChange }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getGroups().then(setGroups).catch(setError).finally(() => setLoading(false));
  }, []);

  useEffect(() => { onGroupsChange?.(groups); }, [groups, onGroupsChange]);

  async function handleCreate(event) {
    event.preventDefault();
    if (!groupName.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const group = await createGroup(groupName);
      setGroups(current => [...current, group]);
      setGroupName('');
      await selectGroup(group);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function selectGroup(group) {
    setSelectedGroup(group);
    try { setMembers(await getGroupMembers(group.id)); }
    catch (requestError) { setError(requestError.message); }
  }

  async function handleAddMember(event) {
    event.preventDefault();
    if (!selectedGroup || !memberEmail.trim() || busy) return;
    setBusy(true); setError('');
    try {
      await addGroupMember(selectedGroup.id, memberEmail);
      setMembers(await getGroupMembers(selectedGroup.id));
      setMemberEmail('');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function handleRemoveMember(userId) {
    if (!selectedGroup || busy) return;
    setBusy(true); setError('');
    try {
      await removeGroupMember(selectedGroup.id, userId);
      setMembers(await getGroupMembers(selectedGroup.id));
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  if (loading) return <section className="groups-panel"><p>Gruppen werden geladen ...</p></section>;

  return (
    <section className="groups-panel" aria-label="Gruppenverwaltung">
      <div className="groups-heading">
        <div>
          <p className="dashboard-eyebrow">ZUSAMMENARBEIT</p>
          <h2>Meine Gruppen</h2>
        </div>
        <span className="groups-count">{groups.length}</span>
      </div>
      {error && <p className="groups-error" role="alert">{error}</p>}
      <form className="group-create" onSubmit={handleCreate}>
        <input value={groupName} onChange={event => setGroupName(event.target.value)} placeholder="Neue Gruppe" maxLength={80} />
        <button type="submit" disabled={busy || !groupName.trim()}>Erstellen</button>
      </form>
      {groups.length === 0 ? (
        <p className="groups-empty">Noch keine Gruppen. Erstelle deine erste Lerngruppe.</p>
      ) : (
        <div className="groups-content">
          <div className="groups-list">
            {groups.map(group => (
              <button className={selectedGroup?.id === group.id ? 'group-item is-selected' : 'group-item'} type="button" key={group.id} onClick={() => selectGroup(group)}>
                <span>{group.name}</span><span aria-hidden="true">›</span>
              </button>
            ))}
          </div>
          {selectedGroup && (
            <div className="group-details">
              <h3>{selectedGroup.name}</h3>
              <ul>
                {members.map(member => (
                  <li key={member.userId}>
                    <span>{member.email || member.userId}</span>
                    {member.userId !== selectedGroup.ownerId && <button type="button" onClick={() => handleRemoveMember(member.userId)}>Entfernen</button>}
                  </li>
                ))}
              </ul>
              <form onSubmit={handleAddMember}>
                <input type="email" value={memberEmail} onChange={event => setMemberEmail(event.target.value)} placeholder="E-Mail-Adresse hinzufügen" />
                <button type="submit" disabled={busy || !memberEmail.trim()}>Hinzufügen</button>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
