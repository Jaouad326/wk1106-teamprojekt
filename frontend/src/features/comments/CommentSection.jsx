import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import './comments.css';

export default function CommentSection({ taskId }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api(`/tasks/${taskId}/comments`)
      .then(data => { if (active) setComments(data); })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [taskId]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true); setError('');
    try {
      const comment = await api(`/tasks/${taskId}/comments`, { method: 'POST', body: { body } });
      setComments(current => [...current, comment]);
      setBody('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="comments-panel">
      <h4>Kommentare</h4>
      {loading ? <p className="comments-status">Kommentare werden geladen ...</p> : <>
        {error && <p className="comments-error" role="alert">{error}</p>}
        {comments.length === 0 ? (
          <p className="comments-empty">Noch keine Kommentare. Schreibe den ersten.</p>
        ) : (
          <ul className="comments-list">
            {comments.map(comment => (
              <li key={comment.id}>
                <p>{comment.body}</p>
                <span>{new Date(comment.createdAt).toLocaleString('de-DE')}</span>
              </li>
            ))}
          </ul>
        )}
        <form className="comment-form" onSubmit={handleSubmit}>
          <label htmlFor={`comment-${taskId}`}>Neuer Kommentar</label>
          <textarea id={`comment-${taskId}`} value={body} maxLength={1000} rows={2}
            onChange={event => setBody(event.target.value)} disabled={submitting} placeholder="Kommentar schreiben ..." />
          <button type="submit" disabled={submitting || !body.trim()}>{submitting ? 'Wird gesendet ...' : 'Kommentar senden'}</button>
        </form>
      </>}
    </div>
  );
}
