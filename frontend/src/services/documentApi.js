const apiPrefix = '/api';

async function request(path, userId, options = {}) {
  const response = await fetch(`${apiPrefix}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'X-User-Id': userId,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || `Falha na requisição (${response.status}).`);
  }

  return response;
}

export async function listDocuments(userId, signal) {
  const response = await request('/documents', userId, { signal });
  return response.json();
}

export async function uploadDocument(userId, file, signal) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', userId, {
    method: 'POST',
    body,
    signal,
  });
  return response.json();
}

export async function downloadDocument(userId, documentId, signal) {
  const response = await request(
    `/documents/${encodeURIComponent(documentId)}/download`,
    userId,
    { signal },
  );
  return response.blob();
}