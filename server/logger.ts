/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pino from 'pino';
import { config } from './config.js';

const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(config.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
  redact: {
    paths: ['password', 'passwordHash', 'req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
});

export default logger;

