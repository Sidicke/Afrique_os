import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ limit: '25mb', extended: true }));
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  const isProd = nodeEnv === 'production';

  // ── Vérifications de sécurité critiques au démarrage ──────────────────────

  // 1. Secrets JWT forts obligatoires en production
  const jwtAccessSecret = config.get<string>('JWT_ACCESS_SECRET');
  const jwtRefreshSecret = config.get<string>('JWT_REFRESH_SECRET');
  if (
    isProd &&
    (!jwtAccessSecret ||
      jwtAccessSecret === 'dev-access-secret' ||
      jwtAccessSecret === 'change-me-access-secret' ||
      !jwtRefreshSecret ||
      jwtRefreshSecret === 'dev-refresh-secret' ||
      jwtRefreshSecret === 'change-me-refresh-secret')
  ) {
    logger.error(
      'ERREUR DE SÉCURITÉ CRITIQUE : JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent être configurés avec des clés fortes en production !',
    );
    process.exit(1);
  }

  // 2. Clé de chiffrement de la messagerie obligatoire
  const messagingKey = config.get<string>('MESSAGING_ENCRYPTION_KEY');
  if (!messagingKey) {
    logger.error(
      'ERREUR DE SÉCURITÉ CRITIQUE : MESSAGING_ENCRYPTION_KEY est absente. ' +
        'Générez une clé aléatoire (ex: openssl rand -hex 32) et ajoutez-la dans .env.',
    );
    process.exit(1);
  }

  // ── Sécurité HTTP ─────────────────────────────────────────────────────────

  // Trust proxy : nécessaire pour que ThrottlerGuard récupère la vraie IP cliente
  // lorsque l'API est derrière Nginx, Cloudflare ou un load-balancer AWS.
  const expressApp = app.getHttpAdapter().getInstance() as { set: (key: string, val: unknown) => void };
  expressApp.set('trust proxy', 1);

  // Helmet : sécurité HTTP renforcée avec Content Security Policy personnalisée.
  // La CSP autorise uniquement les scripts/styles/images de la même origine
  // et du frontend Next.js — bloque les injections XSS cross-origin.
  const rawOriginsForCsp = config.get<string>('CORS_ORIGINS') ?? 'http://localhost:3001';
  const frontendOrigins = rawOriginsForCsp
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline pour les styles inline NestJS (Swagger dev)
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...frontendOrigins],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // désactivé pour compatibilité Socket.IO
    }),
  );

  const rawOrigins = rawOriginsForCsp;
  const origins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true, // nécessaire pour le cookie httpOnly (refresh token)
  });

  // Cookie parser pour lire le refresh token httpOnly
  app.use(cookieParser());


  // Validation stricte : rejet des champs inconnus + transformation des types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Filtre global d'exceptions : assainissement des réponses d'erreur (anti fuite d'info)
  app.useGlobalFilters(new AllExceptionsFilter(config));

  // Préfixe global : /api/v1/...
  app.setGlobalPrefix('api/v1');

  const port = Number(config.get<string>('PORT') ?? 3000);

  // Swagger (documentation API — désactivé en production pour la sécurité)
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Plateforme e-commerce multi-vendeur — API')
      .setDescription(
        'API NestJS : authentification JWT + refresh (cookie httpOnly), boutiques multi-vendeur, messagerie temps réel (WebSocket), catalogue et commandes.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Documentation Swagger : http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  logger.log(`API démarrée en mode ${nodeEnv} sur http://localhost:${port}/api/v1`);
}
void bootstrap();
