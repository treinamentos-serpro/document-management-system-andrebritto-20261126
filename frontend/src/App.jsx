import { useState } from 'react';
import UploadComponent from './components/UploadComponent/UploadComponent.jsx';
import DocumentList from './components/DocumentList/DocumentList.jsx';
import './App.css';

function DocumentsWorkspace({ userId }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <UploadComponent
        userId={userId}
        onUploaded={() => setRefreshKey((current) => current + 1)}
      />
      <DocumentList userId={userId} refreshKey={refreshKey} />
    </>
  );
}

export default function App() {
  const [userInput, setUserInput] = useState('');
  const [userId, setUserId] = useState('');

  function handleUserSubmit(event) {
    event.preventDefault();
    setUserId(userInput.trim());
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="app-brand">DMS</p>
        <h1>Gestão de documentos</h1>
      </header>
      <form className="user-form" onSubmit={handleUserSubmit}>
        <label htmlFor="user-id">
          Identificador do usuário
          <input
            id="user-id"
            type="text"
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={!userInput.trim() || userInput.trim() === userId}>
          {userId ? 'Trocar usuário' : 'Abrir documentos'}
        </button>
      </form>
      {userId && (
        <div>
          <p className="active-user">Usuário atual: <strong>{userId}</strong></p>
          <DocumentsWorkspace key={userId} userId={userId} />
        </div>
      )}
    </main>
  );
}
