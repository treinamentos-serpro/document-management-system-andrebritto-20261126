const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const path = require('node:path');
const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download respeitam o usuário e o armazenamento local', async () => {
  const server = app.listen(0);
  const address = await new Promise((resolve) => {
    server.once('listening', () => resolve(server.address()));
  });
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let uploadedDocument;

  try {
    const missingIdentity = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(missingIdentity.status, 400);
    assert.strictEqual(
      (await missingIdentity.json()).error.code,
      'VALIDATION_ERROR',
    );

    const form = new FormData();
    form.append('file', new Blob(['conteudo do documento']), 'relatorio.txt');
    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'usuario-teste' },
      body: form,
    });

    assert.strictEqual(uploadResponse.status, 201);
    uploadedDocument = await uploadResponse.json();
    assert.deepStrictEqual(
      Object.keys(uploadedDocument).sort(),
      ['id', 'originalName', 'owner', 'size', 'uploadedAt'].sort(),
    );
    assert.strictEqual(uploadedDocument.originalName, 'relatorio.txt');
    assert.strictEqual(uploadedDocument.owner, 'usuario-teste');
    assert.strictEqual(uploadedDocument.size, Buffer.byteLength('conteudo do documento'));

    const listResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'usuario-teste' },
    });
    assert.deepStrictEqual(await listResponse.json(), [uploadedDocument]);

    const otherUserList = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'outro-usuario' },
    });
    assert.deepStrictEqual(await otherUserList.json(), []);

    const forbiddenDownload = await fetch(
      `${baseUrl}/documents/${uploadedDocument.id}/download`,
      { headers: { 'X-User-Id': 'outro-usuario' } },
    );
    assert.strictEqual(forbiddenDownload.status, 404);

    const downloadResponse = await fetch(
      `${baseUrl}/documents/${uploadedDocument.id}/download`,
      { headers: { 'X-User-Id': 'usuario-teste' } },
    );
    assert.strictEqual(downloadResponse.status, 200);
    assert.match(
      downloadResponse.headers.get('content-disposition'),
      /attachment/,
    );
    assert.strictEqual(await downloadResponse.text(), 'conteudo do documento');

    const emptyForm = new FormData();
    emptyForm.append('file', new Blob([]), 'vazio.txt');
    const emptyUpload = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'usuario-teste' },
      body: emptyForm,
    });
    assert.strictEqual(emptyUpload.status, 400);
    assert.strictEqual(
      (await emptyUpload.json()).error.code,
      'VALIDATION_ERROR',
    );
  } finally {
    if (uploadedDocument) {
      await fs.unlink(
        path.join(__dirname, '../storage', uploadedDocument.id),
      );
    }
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
