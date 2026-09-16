import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { IdempotencyService } from './services/idempotency.service';

/**
 * CommonModule — partagé globalement.
 * Fournit WsAuthGuard et IdempotencyService pour toute l'application.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      }),
    }),
  ],
  providers: [WsAuthGuard, IdempotencyService],
  exports: [WsAuthGuard, JwtModule, IdempotencyService],
})
export class CommonModule {}

