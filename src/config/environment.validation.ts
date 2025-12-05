import * as Joi from 'joi';

/**
 * Environment variables validation schema
 * Validates all required environment variables on application startup
 */
export default Joi.object({
  // Application Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4000),
  API_VERSION: Joi.string().default('1.0.0'),

  // Database Configuration
  DATABASE_URL: Joi.string().uri().required(),

  // JWT Configuration
  JWT_SECRET: Joi.string().required(),
  JWT_TOKEN_AUDIENCE: Joi.string().required(),
  JWT_TOKEN_ISSUER: Joi.string().required(),
  JWT_ACCESS_TOKEN_TTL: Joi.number().required(),
  JWT_REFRESH_TOKEN_TTL: Joi.number().required(),

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),

  // Logging Configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('debug'),

  // Cache Configuration
  CACHE_TTL: Joi.number().default(60000),
  CACHE_MAX_ITEMS: Joi.number().default(100),

  // AWS S3 Configuration
  AWS_REGION: Joi.string().required(),
  AWS_ENDPOINT: Joi.string().uri().optional(), // Custom S3-compatible endpoint (Synology C2, Cloudflare R2, etc.)
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  S3_BUCKET_NAME: Joi.string().required(),

  // File Upload Configuration
  MAX_FILE_SIZE: Joi.number().default(5242880),
  ALLOWED_IMAGE_TYPES: Joi.string().default('jpg,jpeg,png,webp'),
  MAX_IMAGES_PER_REVIEW: Joi.number().default(5),

  //Production URL
  PRODUCTION_URL: Joi.string().optional(),

  // Redis Configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_DB: Joi.string().min(0).max(15).default(0),
  REDIS_TTL: Joi.number().default(300), // 5 minutes in seconds
  REDIS_CONNECT_TIMEOUT: Joi.number().default(10000),
  REDIS_MAX_RETRIES: Joi.number().default(3),
});
