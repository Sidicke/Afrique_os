import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

/**
 * Global Exception Filter — Anti Information Leakage (CWE-209).
 * Capture toutes les exceptions de l'application pour empêcher toute fuite
 * d'informations sensibles (traces de pile, erreurs SQL/Prisma, schéma DB).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Une erreur interne est survenue. Veuillez réessayer ultérieurement.';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message ?? exception.message;
        error = resObj.error ?? error;
      } else {
        message = String(res);
      }
    } else {
      // Erreur non gérée / Prisma / Crash inattendu
      const err = exception as Error;
      this.logger.error(
        `[500 Unhandled Error] ${request.method} ${request.url} - ${err?.message}`,
        err?.stack,
      );

      // En développement, on peut afficher l'erreur brute pour faciliter le debug
      if (!isProd) {
        message = err?.message || 'Internal server error';
      }
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
