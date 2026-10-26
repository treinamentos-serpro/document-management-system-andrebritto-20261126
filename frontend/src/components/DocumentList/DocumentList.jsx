import { useEffect, useState } from 'react';
import { listDocuments } from '../../services/documentApi.js';
import DownloadButton from '../DownloadButton/DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});
const sizeFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFormatter.format(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

export default function DocumentList({ userId, refreshKey }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError('');

    async function loadDocuments() {
      try {
        const result = await listDocuments(userId, controller.signal);
        if (!controller.signal.aborted) setDocuments(result);
      } catch (listError) {
        if (!controller.signal.aborted) setError(listError.message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadDocuments();
    return () => controller.abort();
  }, [userId, refreshKey, retryKey]);

  return (
    <section className="documents-section" aria-labelledby="documents-title" aria-busy={isLoading}>
      <div className="section-heading">
        <h2 id="documents-title">Meus documentos</h2>
        <button
          type="button"
          className="secondary-button"
          disabled={isLoading}
          onClick={() => setRetryKey((current) => current + 1)}
        >
          Atualizar
        </button>
      </div>
      {isLoading ? (
        <p role="status">Carregando documentos...</p>
      ) : error ? (
        <p className="error-message" role="alert">{error}</p>
      ) : documents.length === 0 ? (
        <p className="empty-state">Nenhum documento encontrado.</p>
      ) : (
        <ul className="document-list">
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <div className="document-details">
                <h3>{document.originalName}</h3>
                <p>
                  <span>{formatSize(document.size)}</span>
                  <time dateTime={document.uploadedAt}>
                    {dateFormatter.format(new Date(document.uploadedAt))}
                  </time>
                </p>
              </div>
              <DownloadButton userId={userId} document={document} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}