import { useEffect, useRef, useState } from 'react';
import { downloadDocument } from '../../services/documentApi.js';

export default function DownloadButton({ userId, document }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function handleDownload() {
    if (isDownloading) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsDownloading(true);
    setError('');

    try {
      const blob = await downloadDocument(userId, document.id, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      if (!controller.signal.aborted) setError(downloadError.message);
    } finally {
      if (!controller.signal.aborted) setIsDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        className="secondary-button"
        type="button"
        disabled={isDownloading}
        aria-label={`Baixar ${document.originalName}`}
        onClick={handleDownload}
      >
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}