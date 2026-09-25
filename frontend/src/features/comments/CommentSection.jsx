import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../auth/AuthContext.js';
import './comments.css';

export default function CommentSection({ taskId, onClose }) {
  const { user } = useAuth();
  const panelRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (panelRef.current?.contains(target) || target.closest('.comments-toggle')) return;
      onClose();
    }
    document.addEventListener('click', closeOnOutsideClick);
    return () => document.removeEventListener('click', closeOnOutsideClick);
  }, [onClose]);

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

  async function handleDelete(commentId) {
    if (!window.confirm('Diesen Kommentar wirklich löschen?') || deletingId) return;
    setDeletingId(commentId); setError('');
    try {
      await api(`/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
      setComments(current => current.filter(comment => comment.id !== commentId));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="comments-panel" ref={panelRef}>
      <div className="comments-heading">
        <h4>Kommentare</h4>
        <button className="comments-close" type="button" onClick={onClose} aria-label="Kommentare schließen">×</button>
      </div>
      {loading ? <p className="comments-status">Kommentare werden geladen ...</p> : <>
        {error && <p className="comments-error" role="alert">{error}</p>}
        {comments.length === 0 ? (
          <p className="comments-empty">Noch keine Kommentare. Schreibe den ersten.</p>
        ) : (
          <ul className="comments-list">
            {comments.map(comment => (
              <li key={comment.id}>
                <p>{comment.body}</p>
                <div className="comment-meta">
                  <span>{new Date(comment.createdAt).toLocaleString('de-DE')}</span>
                  {comment.authorId === user.id && <button type="button" className="comment-delete"
                    onClick={() => handleDelete(comment.id)} disabled={deletingId === comment.id}>
                    {deletingId === comment.id ? 'Löschen ...' : 'Löschen'}
                  </button>}
                </div>
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
