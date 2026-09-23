export async function api(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-StudyPrio-Request': '1' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
  } catch {
    throw new Error('Keine Verbindung. Bitte versuche es erneut.');
  }
  const result = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(result?.error?.message || 'Die Anfrage ist fehlgeschlagen.');
    error.status = response.status;
    throw error;
  }
  return result?.data;
}
