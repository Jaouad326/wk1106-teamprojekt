async function handleResponse(response) {
  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(
      result.error?.message || 'Fehler bei der Anfrage.'
    );
  }

  return result.data;
}

export async function getGroups() {
  const response = await fetch('/api/groups');
  return handleResponse(response);
}

export async function createGroup(name) {
  const response = await fetch('/api/groups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  });

  return handleResponse(response);
}

export async function getGroup(groupId) {
  const response = await fetch(`/api/groups/${groupId}`);
  return handleResponse(response);
}

export async function getGroupMembers(groupId) {
  const response = await fetch(`/api/groups/${groupId}/members`);
  return handleResponse(response);
}

export async function addGroupMember(groupId, email) {
  const response = await fetch(`/api/groups/${groupId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });

  return handleResponse(response);
}

export async function removeGroupMember(groupId, userId) {
  const response = await fetch(
    `/api/groups/${groupId}/members/${userId}`,
    {
      method: 'DELETE'
    }
  );

  if (!response.ok) {
    const result = await response.json();

    throw new Error(
      result.error?.message || 'Fehler beim Entfernen des Mitglieds.'
    );
  }
}