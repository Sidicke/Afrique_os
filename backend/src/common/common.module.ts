import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { WsAuthGuard } from './guards/ws-auth.guard';

/**
 * CommonModule — partagé globalement.
 * Fournit WsAuthGuard (authentification WebSocket) avec ses dépendances
 * (JwtService + ConfigService) pour les gateways.
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
  providers: [WsAuthGuard],
  exports: [WsAuthGuard, JwtModule],
})
export class CommonModule {}
