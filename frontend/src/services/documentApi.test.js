import assert from 'node:assert/strict';
import { test } from 'node:test';
import { downloadDocument, listDocuments, uploadDocument } from './documentApi.js';

test('lista os documentos com prefixo /api, usuário e sinal de cancelamento', async (context) => {
  const documents = [{ id: 'document-1', originalName: 'arquivo.txt' }];
  const signal = new AbortController().signal;
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/documents');
    assert.equal(options.headers['X-User-Id'], 'ana');
    assert.equal(options.signal, signal);
    return Response.json(documents);
  });

  assert.deepEqual(await listDocuments('ana', signal), documents);
});

test('envia o arquivo no campo file sem definir Content-Type manualmente', async (context) => {
  const file = new File(['conteúdo'], 'arquivo.txt', { type: 'text/plain' });
  const metadata = { id: 'document-1' };
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/upload');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['X-User-Id'], 'ana');
    assert.equal(options.headers['Content-Type'], undefined);
    assert.equal(options.body.get('file'), file);
    return Response.json(metadata, { status: 201 });
  });

  assert.deepEqual(await uploadDocument('ana', file), metadata);
});

test('baixa o conteúdo binário com o usuário e codifica o identificador', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/documents/id%2Fespecial/download');
    assert.equal(options.headers['X-User-Id'], 'ana');
    return new Response('conteúdo do documento');
  });

  const blob = await downloadDocument('ana', 'id/especial');
  assert.equal(await blob.text(), 'conteúdo do documento');
});

test('preserva a mensagem de erro retornada pelo backend', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json(
    { error: { message: 'Documento não encontrado.' } },
    { status: 404 },
  ));

  await assert.rejects(downloadDocument('ana', 'missing'), /Documento não encontrado/);
});

test('trata respostas de erro que não são JSON', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('Bad Gateway', { status: 502 }));

  await assert.rejects(listDocuments('ana'), /Falha na requisição \(502\)/);
});

test('propaga falhas de rede e cancelamento', async (context) => {
  const error = new DOMException('Requisição cancelada', 'AbortError');
  context.mock.method(globalThis, 'fetch', async () => { throw error; });

  await assert.rejects(listDocuments('ana'), (received) => received === error);
});