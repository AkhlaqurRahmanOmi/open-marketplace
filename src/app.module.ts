import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './core/config/prisma/prisma.module';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AuthenticationGuard } from './auth/guards/authentication/authentication.guard';
import { AccessTokenGuard } from './auth/guards/access-token/access-token.guard';
import { PermissionsGuard } from './auth/guards/permissions/permissions.guard';
import jwtConfig from './auth/config/jwt.config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import cacheConfig from './config/cache.config';
import storageConfig from './config/storage.config';
import redisConfig from './config/redis.config';
import environmentValidation from './config/environment.validation';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from './logger/logger.module';
import { HttpLoggerMiddleware } from './logger/http-logger.middleware';
import { SharedModule } from './shared/shared.module';
import { GlobalResponseInterceptor } from './shared/interceptors/global-response.interceptor';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TraceIdMiddleware } from './shared/middleware/trace-id.middleware';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

// Infrastructure Modules
import { RedisCacheModule } from './core/config/cache/redis-cache.module';
import { QueueModule } from './core/config/queue/queue.module';

// Organizational Modules (Multi-Vendor Structure)
import { CoreModule } from './modules/core.module';
import { PlatformModule } from './modules/platform.module';
import { VendorModule } from './modules/vendor.module';
import { PublicModule } from './modules/public.module';
import { AdminModule } from './modules/admin.module';
import { AttributesModule } from './attributes/attributes.module';
import { PaymentsModule } from './payments/payments.module';
// import { TasksModule } from './tasks/tasks.module'; // TODO: Re-enable later
@Module({
  imports: [
    // Global configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, cacheConfig, storageConfig, jwtConfig, redisConfig],
      validationSchema: environmentValidation,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    // Event Emitter for async event-driven notifications
    EventEmitterModule.forRoot(),

    // Infrastructure Modules
    LoggerModule,
    SharedModule,
    PrismaModule,
    RedisCacheModule, // Redis-based caching
    QueueModule, // BullMQ queue infrastructure
    JwtModule.registerAsync(jwtConfig.asProvider()),
    PaymentsModule, // Payment processing (shared)
    // TasksModule, // TODO: Re-enable scheduled tasks

    // BullBoard - Queue monitoring dashboard
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'notification-email',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'notification-realtime',
      adapter: BullMQAdapter,
    }),

    // Business Modules (Multi-Vendor Architecture)
    CoreModule,      // Auth, User, RBAC (shared foundation)
    PlatformModule,  // Super admin: Manage vendors, analytics, payouts
    VendorModule,    // Vendor dashboard: Products, orders, inventory
    PublicModule,    // Customer store: Browse, cart, checkout, reviews
    AdminModule,     // Legacy admin routes (backward compatibility)

    // Supporting Modules
    AttributesModule, // Dynamic attributes for organizations/products
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    AccessTokenGuard,
    // Global permissions guard for role and permission-based access control
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    // Global response interceptor for standardized responses with HATEOAS
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalResponseInterceptor,
    },
    // Global exception filter for standardized error responses
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TraceIdMiddleware, HttpLoggerMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
