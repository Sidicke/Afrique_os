import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Sécurité HTTP : Helmet + CORS strict (domaine Next.js uniquement)
  app.use(helmet());

  const rawOrigins = config.get<string>('CORS_ORIGINS') ?? 'http://localhost:3001';
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

  // Préfixe global : /api/v1/...
  app.setGlobalPrefix('api/v1');

  // Swagger (documentation API)
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

  const port = Number(config.get<string>('PORT') ?? 3000);
  await app.listen(port);
  logger.log(`API démarrée sur http://localhost:${port}/api/v1`);
  logger.log(`Documentation Swagger : http://localhost:${port}/api/docs`);
}
void bootstrap();
