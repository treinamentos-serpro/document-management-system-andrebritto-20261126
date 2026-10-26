const fs = require('node:fs/promises');
const path = require('node:path');
const documentRepository = require('../repositories/documentRepository');

class ServiceError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function create(owner, file) {
  if (!file || file.size === 0) {
    if (file && file.path) {
      await fs.unlink(file.path);
    }
    throw new ServiceError(
      'O arquivo enviado não pode estar vazio.',
      400,
      'VALIDATION_ERROR',
    );
  }

  const document = {
    id: file.filename,
    originalName: path.basename(file.originalname.replace(/\\/g, '/')),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storagePath: file.path,
  };

  try {
    documentRepository.create(document);
  } catch (error) {
    try {
      await fs.unlink(file.path);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Falha ao registrar o documento e remover o arquivo não registrado.',
      );
    }
    throw error;
  }

  return toPublicMetadata(document);
}

function listByOwner(owner) {
  return documentRepository
    .listByOwner(owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map(toPublicMetadata);
}

function getForDownload(id, owner) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    throw new ServiceError(
      'Documento não encontrado.',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }
  return document;
}

function createStorageError(error) {
  const storageError = new ServiceError(
    'Não foi possível ler o arquivo armazenado.',
    500,
    'STORAGE_ERROR',
  );
  storageError.cause = error;
  return storageError;
}

function toPublicMetadata(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

module.exports = {
  create,
  listByOwner,
  getForDownload,
  createStorageError,
};
