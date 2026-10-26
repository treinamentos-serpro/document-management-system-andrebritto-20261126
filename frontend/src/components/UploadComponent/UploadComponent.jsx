import { useEffect, useRef, useState } from 'react';
import { uploadDocument } from '../../services/documentApi.js';

export default function UploadComponent({ userId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) return;

    setError('');
    setMessage('');
    if (file.size === 0) {
      setError('Selecione um arquivo que não esteja vazio.');
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsUploading(true);
    try {
      await uploadDocument(userId, file, controller.signal);
      setFile(null);
      inputRef.current.value = '';
      setMessage('Documento enviado com sucesso.');
      onUploaded();
    } catch (uploadError) {
      if (!controller.signal.aborted) setError(uploadError.message);
    } finally {
      if (!controller.signal.aborted) setIsUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <h2 id="upload-title">Enviar documento</h2>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-field" htmlFor="document-file">
          Arquivo
          <input
            ref={inputRef}
            id="document-file"
            type="file"
            required
            disabled={isUploading}
            onChange={(event) => {
              setFile(event.target.files[0] || null);
              setError('');
              setMessage('');
            }}
          />
        </label>
        <button type="submit" disabled={!file || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>
      {error && <p className="error-message" role="alert">{error}</p>}
      <p className="success-message" role="status">{message}</p>
    </section>
  );
}