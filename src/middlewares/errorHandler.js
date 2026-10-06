// Clase de error "de negocio" que los services pueden lanzar a propósito
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Debe ir AL FINAL de app.js, después de montar todas las rutas
function errorHandler(err, req, res, next) {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Error interno del servidor';

  res.status(statusCode).json({
    ok: false,
    error: message
  });
}

// Envuelve controllers async para no escribir try/catch en cada uno
function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = { AppError, errorHandler, asyncHandler };
