// Delegiert Cookies/CSRF vollständig an Jaouads Client. Kein eigener fetch-Login.
// Aktueller Branch: api(path, options). Vorgeschlagener Vertrag: api.get/post/….
export function createTaskApi(api) {
  function request(method, path, body) {
    if (typeof api === 'function') return api(path, { method, ...(body === undefined ? {} : { body }) });
    const call = api?.[method.toLowerCase()];
    if (typeof call !== 'function') throw new Error('Der gemeinsame API-Client fehlt.');
    return call.call(api, path, body);
  }
  const pathFor = id => `/tasks/${encodeURIComponent(id)}`;
  return {
    list: () => request('GET', '/tasks'),
    get: id => request('GET', pathFor(id)),
    create: task => request('POST', '/tasks', task),
    update: (id, changes) => request('PATCH', pathFor(id), changes),
    // Jaouads protectWrites verlangt auch bei DELETE einen JSON-Body.
    remove: id => request('DELETE', pathFor(id), {})
  };
}
