import { useState, useEffect } from 'react';

export default function CommentSection({ taskId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/comments`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error.message);
        setComments(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [taskId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newComment })
      });
      const result = await res.json();
      
      if (result.error) throw new Error(result.error.message);
      
      setComments([...comments, result.data]);
      setNewComment('');
    } catch (err) {
      alert('Fehler beim Senden: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Möchtest du diesen Kommentar wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      
      if (result.error) throw new Error(result.error.message);
      
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  if (loading) return <p>Kommentare werden geladen...</p>;
  if (error) return <p style={{ color: 'red' }}>Fehler: {error}</p>;

  return (
    <div style={{ marginTop: '30px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
      <h3>Kommentare zur Aufgabe</h3>
      
      {comments.length === 0 ? (
        <p style={{ color: '#666' }}>Noch keine Kommentare vorhanden. Mach den Anfang!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {comments.map(c => (
            <li key={c.id} style={{ background: '#f9f9f9', padding: '15px', marginBottom: '10px', borderRadius: '8px', position: 'relative' }}>
              <small style={{ color: '#888' }}>
                Autor-ID: {c.authorId} | Gesendet am: {new Date(c.createdAt).toLocaleString('de-DE')}
              </small>
              <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>{c.body}</p>
              
              <button 
                onClick={() => handleDelete(c.id)}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px' }}
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <textarea 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Schreibe einen Kommentar... (max. 1000 Zeichen)"
          maxLength={1000}
          rows="3"
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          disabled={submitting}
        />
        <button 
          type="submit" 
          disabled={submitting || !newComment.trim()}
          style={{ marginTop: '10px', padding: '10px 20px', cursor: 'pointer', background: '#0056b3', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          {submitting ? 'Wird gesendet...' : 'Kommentar senden'}
        </button>
      </form>
    </div>
  );
}