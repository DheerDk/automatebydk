import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  code?: string;
  errors?: any[];
}

export class AppError extends Error {
  statusCode: number;
  code?: string;
  errors?: any[];

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('API Error:', {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: formattedErrors,
    });
  }

  if (err instanceof AppError || (err as any).statusCode) {
    const statusCode = (err as any).statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message,
      code: (err as any).code || 'APP_ERROR',
      errors: (err as any).errors,
    });
  }

  // Handle Prisma Known Request Errors
  if ((err as any).code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A unique constraint was violated (record already exists)',
      code: 'DUPLICATE_RECORD',
    });
  }

  if ((err as any).code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found',
      code: 'NOT_FOUND',
    });
  }

  // Generic Unhandled Error (Conceals internal stack/DB errors in production)
  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    success: false,
    message: isProd ? 'An unexpected internal server error occurred. Please try again later.' : (err.message || 'Internal server error'),
    code: 'INTERNAL_SERVER_ERROR',
  });
};
