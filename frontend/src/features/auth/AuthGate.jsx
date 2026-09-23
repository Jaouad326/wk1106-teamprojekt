import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import './auth.css';

// Nur lesen: React StrictMode darf den Link beim zweiten Render nicht verlieren.
function readLink() {
  return window.location.pathname === '/auth/verify'
    ? new URLSearchParams(window.location.hash.slice(1)).get('token') || '' : '';
}

export default function AuthGate({ children }) {
  const [token, setToken] = useState(readLink);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [localMail, setLocalMail] = useState(false);

  useEffect(() => {
    if (window.location.pathname === '/auth/verify') {
      window.history.replaceState(null, '', '/auth/verify');
    }
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setError('');
    Promise.all([
      api('/auth/config'),
      api('/auth/me').catch(err => { if (err.status === 401) return null; throw err; })
    ]).then(([config, currentUser]) => {
      if (active) { setLocalMail(config.localMail); setUser(currentUser); }
    }).catch(err => {
      if (active) { setError(err.message); setLoadFailed(true); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  async function run(action) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function requestLink(event) {
    event.preventDefault();
    run(async () => {
      const result = await api('/auth/request-link', { method: 'POST', body: { email } });
      setMessage(result.message);
    });
  }
  function confirmLink() {
    run(async () => {
      const currentUser = await api('/auth/verify', { method: 'POST', body: { token } });
      setUser(currentUser); setToken(''); window.history.replaceState(null, '', '/');
    });
  }
  function logout() {
    run(async () => {
      await api('/auth/logout', { method: 'POST', body: {} });
      setUser(null); setToken(''); setEmail('');
      window.history.replaceState(null, '', '/');
      setMessage('Du bist abgemeldet.');
    });
  }
  function discardLink() {
    setToken(''); setError(''); window.history.replaceState(null, '', '/');
  }

  return <main className="auth-layout">
    <header><h1>StudyPrio</h1><p>Dein Studium. Deine nächsten Aufgaben.</p></header>
    <section className="auth-card" aria-busy={busy || loading}>
      {loading ? <p role="status">Anmeldung wird geprüft …</p> : <>
        {localMail && <p className="auth-note">Lokaler Testmodus – es werden keine E-Mails versendet. Er bestätigt keinen echten Zugriff auf ein Postfach.</p>}
        {error && <p role="alert" className="auth-error">{error}</p>}
        {message && <p role="status" className="auth-message">{message}</p>}
        {loadFailed ? <button onClick={() => setRetry(value => value + 1)}>Erneut versuchen</button>
          : token ? <>
            <h2>Anmeldung bestätigen</h2>
            <p>Bestätige nur einen Link, den du selbst für deine E-Mail-Adresse angefordert hast.</p>
            {user && <p>Aktuell angemeldet: {user.email}. Die Bestätigung ersetzt diese Sitzung.</p>}
            <button onClick={confirmLink} disabled={busy}>{busy ? 'Wird geprüft …' : 'Anmeldung bestätigen'}</button>
            <button className="secondary" onClick={discardLink} disabled={busy}>Zurück zur Anmeldung</button>
          </> : user ? <>
            <div className="auth-user"><p>Angemeldet als <strong>{user.email}</strong></p>
              <button className="secondary" onClick={logout} disabled={busy}>Abmelden</button></div>
            {children}
          </> : <>
            <h2>Anmelden</h2>
            <p>Du bekommst einen Link an deine Hochschul-E-Mail. Ein Passwort brauchst du nicht.</p>
            <form onSubmit={requestLink}>
              <label htmlFor="login-email">Hochschul-E-Mail</label>
              <input id="login-email" type="email" autoComplete="email" required maxLength={254}
                value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
              <button type="submit" disabled={busy}>{busy ? 'Wird angefordert …' : 'Anmeldelink anfordern'}</button>
            </form>
            <p className="auth-hint">Der Link gilt 15 Minuten. Dies ist kein offizieller THM-Login.</p>
          </>}
      </>}
    </section>
  </main>;
}
