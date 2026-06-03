import pino from 'pino';

export const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'token', 'tokens', 'authorization', 'cookie',
      '*.token', '*.tokens', '*.authorization', '*.cookie',
      'env.*', 'headers.authorization', 'headers.cookie',
    ],
    censor: '[redacted]',
  },
});
