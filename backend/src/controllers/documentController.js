const documentService = require('../services/documentService');

function requireUserId(req, res, next) {
  const userId = req.get('X-User-Id');
  if (!userId || !userId.trim()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'O cabeçalho X-User-Id é obrigatório.',
      },
    });
  }

  req.userId = userId.trim();
  return next();
}

async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Envie um arquivo no campo "file".',
        },
      });
    }

    const document = await documentService.create(req.userId, req.file);
    return res.status(201).json(document);
  } catch (error) {
    return next(error);
  }
}

function list(req, res, next) {
  try {
    return res.json(documentService.listByOwner(req.userId));
  } catch (error) {
    return next(error);
  }
}

function download(req, res, next) {
  try {
    const document = documentService.getForDownload(req.params.id, req.userId);
    return res.download(
      document.storagePath,
      document.originalName,
      (error) => {
        if (error && !res.headersSent) {
          next(documentService.createStorageError(error));
        } else if (error) {
          res.destroy(error);
        }
      },
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireUserId,
  upload,
  list,
  download,
};
