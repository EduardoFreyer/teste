import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { ShippingModule } from './shipping/shipping.module';
import { StorefrontModule } from './storefront/storefront.module';
import { CheckoutModule } from './checkout/checkout.module';
import { AccountModule } from './account/account.module';
import { validateEnv } from './common/schemas/env.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>('THROTTLE_TTL_SECONDS') * 1000,
          limit: configService.getOrThrow<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    DatabaseModule,
    AuditModule,
    UsersModule,
    AuthModule,
    CatalogModule,
    StorefrontModule,
    ShippingModule,
    CheckoutModule,
    AccountModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
