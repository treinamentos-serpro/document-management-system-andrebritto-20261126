const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const express = require('express');
const documentController = require('../controllers/documentController');

const router = express.Router();
const storageDirectory = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '../../storage'),
);
const maxFileSize = Number(
  process.env.UPLOAD_MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024,
);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDirectory, { recursive: true }, (error) => {
      callback(error, storageDirectory);
    });
  },
  filename(req, file, callback) {
    callback(null, crypto.randomUUID());
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number.isSafeInteger(maxFileSize) && maxFileSize > 0
      ? maxFileSize
      : 10 * 1024 * 1024,
    files: 1,
  },
});

router.post(
  '/upload',
  documentController.requireUserId,
  upload.single('file'),
  documentController.upload,
);
router.get('/documents', documentController.requireUserId, documentController.list);
router.get(
  '/documents/:id/download',
  documentController.requireUserId,
  documentController.download,
);

module.exports = router;
