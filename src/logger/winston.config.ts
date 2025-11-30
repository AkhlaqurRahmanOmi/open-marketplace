// src/logger/winston.config.ts
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import * as fs from 'fs'
import * as path from 'path'


/**
 * Adding checkpoint for creating the logs
 *
 * */
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

//add docker checkpoint
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, {recursive: true});
}

/**
 * Configuration for Winston logger
 * This configuration sets up the logger to log messages in JSON format with timestamps and error stack traces
 * Logs are written to both console and files (error.log and combined.log)
 */
const isProduction = process.env.NODE_ENV === 'production';

export const winstonConfig: winston.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transports: [
    // Console transport with pretty printing for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD hh:mm:ss A' }),
        winston.format.ms(),
        winston.format.padLevels(),
        winston.format.splat(),
        winston.format.json(),
        nestWinstonModuleUtilities.format.nestLike('E-Commerce', {
          prettyPrint: true,
          colors: true,
          appName: true,
            processId: false,
            // context: true,
            // traceId: true,
        }),
      ),
    }),
    // Error logs - separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD hh:mm:ss A' }),
        winston.format.errors({ stack: true }),
        winston.format.json({
          space: 2,
        }),
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs - all levels
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD hh:mm:ss A' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, traceId, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            traceId: traceId,
            message,
            ...meta
          }, null, 2);
        }),
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Warning logs - separate file
    new winston.transports.File({
      filename: 'logs/warn.log',
      level: 'warn',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD hh:mm:ss A' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, traceId, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            traceId: traceId,
            message,
            ...meta
          }, null, 2);
        }),
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
};
