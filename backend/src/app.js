const express = require('express');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', documentRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'O arquivo excede o limite permitido.',
      },
    });
  }

  if (error.name === 'MulterError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Não foi possível processar o arquivo enviado.',
      },
    });
  }

  const status = error.statusCode || 500;
  const code = status >= 500
    ? (error.code === 'STORAGE_ERROR' || error.syscall
      ? 'STORAGE_ERROR'
      : 'INTERNAL_ERROR')
    : (error.code || 'VALIDATION_ERROR');
  const message = status >= 500
    ? 'Ocorreu um erro interno ao processar a solicitação.'
    : error.message;

  return res.status(status).json({ error: { code, message } });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
