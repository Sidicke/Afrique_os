import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { BoutiquesModule } from './boutiques/boutiques.module';
import { BrandsModule } from './brands/brands.module';
import { CommonModule } from './common/common.module';
import { CategoriesModule } from './categories/categories.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { MessagingModule } from './messaging/messaging.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { SearchModule } from './search/search.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get<string>('THROTTLE_TTL') ?? 60_000),
            limit: Number(config.get<string>('THROTTLE_LIMIT') ?? 120),
          },
        ],
      }),
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    AdminModule,
    UsersModule,
    BoutiquesModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    OrdersModule,
    DashboardModule,
    MessagingModule,
    NewsletterModule,
    NotificationsModule,
    SearchModule,
  ],
  providers: [
    // Guards globaux : toutes les routes sont protégées par défaut (JWT),
    // @Public() les contourne ; @Roles(...) restreint par rôle.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
