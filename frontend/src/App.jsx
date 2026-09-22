import AuthGate from './features/auth/AuthGate.jsx';

function App() {
  return (
    <AuthGate>
      <h2>Willkommen bei StudyPrio</h2>
      <p>Du bist angemeldet. Die Aufgaben- und Gruppenansicht wird als Nächstes verbunden.</p>
    </AuthGate>
  );
}

export default App;
