import AuthGate from './features/auth/AuthGate.jsx';
import CommentSection from './features/comments/CommentSection.jsx';
import GroupsPage from './features/groups/GroupsPage.jsx';

function App() {
  return (
    <AuthGate>
      <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>StudyPrio</h1>
        <GroupsPage />
        <CommentSection taskId="test-task-1" />
      </div>
    </AuthGate>
  );
}

export default App;
