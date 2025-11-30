import { registerAs } from '@nestjs/config';

/**
 * Application configuration
 * Contains general application settings
 */
export default registerAs('app', () => ({
  /** Node environment (development, production, test) */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** Server port */
  port: parseInt(process.env.PORT || '6000', 10),

  /** API version */
  apiVersion: process.env.API_VERSION || '1.0.0',

  /** Logging level */
  logLevel: process.env.LOG_LEVEL || 'debug',

  /** Application name */
  name: 'E-Commerce API',

  /** Global API prefix */
  globalPrefix: 'api',
}));
