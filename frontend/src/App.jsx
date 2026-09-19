// frontend/src/App.jsx
import { useState, useEffect } from 'react'

function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(json => setHealth(json.data))
      .catch(err => console.error(err))
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>StudyPrio - Minimal Setup</h1>
      <p>Frontend: React + Vite läuft.</p>
      <div>
        <h2>Backend Status:</h2>
        {health ? (
          <pre style={{ background: '#f4f4f4', padding: '1rem' }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        ) : (
          <p>Lade API-Status...</p>
        )}
      </div>
    </div>
  )
}

export default App