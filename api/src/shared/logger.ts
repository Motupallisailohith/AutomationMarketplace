import winston from 'winston';
import { Container } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';

let logLevel = 'info';
try {
  const config = Container.get(GlobalConfig);
  logLevel = config.logging.level;
} catch {
  // Config not initialized yet, use default
}

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

let isProduction = false;
try {
  const config = Container.get(GlobalConfig);
  isProduction = config.deployment.type === 'n8n-cloud';
} catch {
  // Config not initialized yet
}

if (!isProduction) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}