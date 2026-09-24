import { useEffect, useState } from 'react';
import {
  getGroups,
  createGroup,
  getGroupMembers,
  addGroupMember,
  removeGroupMember
} from './groupsApi.js';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);

  const [groupName, setGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [creating, setCreating] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      setLoading(true);
      setError(null);

      const data = await getGroups();
      setGroups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(event) {
    event.preventDefault();

    if (!groupName.trim() || creating) {
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const newGroup = await createGroup(groupName);

      setGroups([...groups, newGroup]);
      setGroupName('');
      setSelectedGroup(newGroup);

      const newMembers = await getGroupMembers(newGroup.id);
      setMembers(newMembers);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSelectGroup(group) {
    try {
      setError(null);
      setSelectedGroup(group);

      const data = await getGroupMembers(group.id);
      setMembers(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddMember(event) {
    event.preventDefault();

    if (!memberEmail.trim() || !selectedGroup || addingMember) {
      return;
    }

    try {
      setAddingMember(true);
      setError(null);

      await addGroupMember(
        selectedGroup.id,
        memberEmail
      );

      const updatedMembers = await getGroupMembers(
        selectedGroup.id
      );

      setMembers(updatedMembers);
      setMemberEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(userId) {
    if (!selectedGroup) {
      return;
    }

    try {
      setError(null);

      await removeGroupMember(
        selectedGroup.id,
        userId
      );

      const updatedMembers = await getGroupMembers(
        selectedGroup.id
      );

      setMembers(updatedMembers);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p>Gruppen werden geladen...</p>;
  }

  return (
    <div style={{ marginTop: '30px' }}>
      <h2>Meine Gruppen</h2>

      {error && (
        <p style={{ color: 'red' }}>
          Fehler: {error}
        </p>
      )}

      <form onSubmit={handleCreateGroup}>
        <input
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          placeholder="Gruppenname"
          maxLength={80}
        />

        <button
          type="submit"
          disabled={creating || !groupName.trim()}
        >
          {creating ? 'Wird erstellt...' : 'Gruppe erstellen'}
        </button>
      </form>

      <h3>Gruppen</h3>

      {groups.length === 0 ? (
        <p>Noch keine Gruppen vorhanden.</p>
      ) : (
        <ul>
          {groups.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                onClick={() => handleSelectGroup(group)}
              >
                {group.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedGroup && (
        <div style={{ marginTop: '20px' }}>
          <h3>
            Gruppe: {selectedGroup.name}
          </h3>

          <h4>Mitglieder</h4>

          <ul>
            {members.map((member) => (
              <li key={member.userId}>
                {member.userId}

                {member.userId !== selectedGroup.ownerId && (
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveMember(member.userId)
                    }
                    style={{ marginLeft: '10px' }}
                  >
                    Entfernen
                  </button>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddMember}>
            <input
              value={memberEmail}
              onChange={(event) =>
                setMemberEmail(event.target.value)
              }
              placeholder="E-Mail-Adresse"
              type="email"
            />

            <button
              type="submit"
              disabled={
                addingMember ||
                !memberEmail.trim()
              }
            >
              {addingMember
                ? 'Wird hinzugefügt...'
                : 'Mitglied hinzufügen'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}