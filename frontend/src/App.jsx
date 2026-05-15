import CommentSection from './features/comments/CommentSection.jsx';

function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>StudyPrio - Vorschau</h1>
      
      <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
        <h2>Aufgabe: Präsentation vorbereiten</h2>
        <p><strong>Beschreibung:</strong> Das ist ein Platzhalter für Amins Aufgabendetails. Hier steht später, was genau zu tun ist.</p>
        <p><strong>Fälligkeit:</strong> 25.09.2026</p>
      </div>
      
      {/* Hier wird dein programmierter Baustein eingebunden! */}
      <CommentSection taskId="test-task-1" />
    </div>
  );
}

export default App;