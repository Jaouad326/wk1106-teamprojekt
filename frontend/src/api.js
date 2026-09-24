export const SESSION_EXPIRED_EVENT = 'studyprio:session-expired';

export async function api(path, { method = 'GET', body } = {}) {
  method = method.toUpperCase();
  const writing = !['GET', 'HEAD'].includes(method);
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: writing ? { 'Content-Type': 'application/json', 'X-StudyPrio-Request': '1' } : {},
      ...(writing ? { body: JSON.stringify(body ?? {}) } : {})
    });
  } catch {
    throw new Error('Keine Verbindung. Bitte versuche es erneut.');
  }
  const result = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(result?.error?.message || 'Die Anfrage ist fehlgeschlagen.');
    error.status = response.status;
    error.code = result?.error?.code;
    error.fields = result?.error?.fields;
    if (response.status === 401 && path !== '/auth/me' && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw error;
  }
  return result?.data;
}
