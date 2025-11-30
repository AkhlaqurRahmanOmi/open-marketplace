import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {NestExpressApplication} from "@nestjs/platform-express";
import { swaggerConfig } from './config/swagger.config';

async function bootstrap() {
  // Create app with Winston logger only (disable default NestJS logger)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  //using etag for cache validation
  app.set('etag', 'weak')

  // Get configuration service
  const configService = app.get(ConfigService);

  // Get Winston logger instance
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  // Replace NestJS logger with Winston
  app.useLogger(logger);

  // Get app configuration
  const port = configService.get<number>('app.port') || 6000;
  const apiVersion = configService.get<string>('app.apiVersion') || '1.0.0';
  const environment = configService.get<string>('app.nodeEnv');

  //testing something
  // app.use((req, res, next) => {
  //   if (req.method === 'GET') {
  //     res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  //   }
  //   next();
  // });

  // Set global prefix and enable versioning (must be before Swagger setup)
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup Swagger documentation (after versioning is configured)
  // const documentation = new DocumentBuilder()
  //   .setTitle('E-Commerce API')
  //   .setDescription('E-Commerce REST API Documentation')
  //   .setVersion(apiVersion)
  //   .addServer(`http://localhost:${port}`, 'Local development server')
  //   .addBearerAuth(
  //     {
  //       type: 'http',
  //       scheme: 'bearer',
  //       bearerFormat: 'JWT',
  //       name: 'JWT',
  //       description: 'Enter JWT token',
  //       in: 'header',
  //     },
  //     'JWT-auth',
  //   )
  //   .build();

  const documentation = SwaggerModule.createDocument(app, swaggerConfig);
  // const documentFactory = () => SwaggerModule.createDocument(app, documentation);

  SwaggerModule.setup('api/docs', app, documentation);

  // Enable CORS
  app.enableCors();

  await app.listen(port);

  // Use Winston logger for startup messages
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`🔄 API Versioning enabled - URI-based with default version '1'`);
  logger.log(`🌍 Environment: ${environment}`);
  logger.log(`📦 API Version: ${apiVersion}`);
}
bootstrap();
