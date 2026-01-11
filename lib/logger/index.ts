// Server-side singleton logger
// Client-side usage returns a no-op logger to prevent errors

// No-op logger for client-side (prevents errors but does nothing)
const noOpLogger = {
  info: async () => {},
  warn: async () => {},
  error: async () => {},
  debug: async () => {},
};

// Import server logger
// Next.js automatically code-splits and won't bundle this for client
// The logger.ts file has guards to prevent client-side usage
import { logger as serverLogger } from './logger';

// Export server-side logger or no-op logger based on environment
// This check happens at runtime, but Next.js ensures serverLogger
// is only available on server-side due to code splitting
export const logger = typeof window === 'undefined' ? serverLogger : noOpLogger;
