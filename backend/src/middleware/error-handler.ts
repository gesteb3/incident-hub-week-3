import type { ErrorRequestHandler } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos',
        details: z.flattenError(error),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno' },
  });
};
