import AuthGate from './features/auth/AuthGate.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';

function App() {
  return (
    <AuthGate>
      <DashboardPage />
    </AuthGate>
  );
}

export default App;
