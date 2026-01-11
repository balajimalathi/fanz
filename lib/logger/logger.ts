// Server-side singleton logger
// Writes logs to files - Promtail handles syncing to Loki

import type * as FsPromises from 'fs/promises';
import type * as Path from 'path';

let fs: typeof FsPromises | undefined;
let path: typeof Path | undefined;

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

class Logger {
  private static instance: Logger | null = null;
  private logDir: string;
  private appLogPath: string;
  private errorLogPath: string;
  private initialized = false;

  private constructor() {
    // Server-side only check
    if (typeof window !== 'undefined') {
      throw new Error('Logger can only be used on the server side');
    }

    this.logDir = process.env.LOG_DIR || 
      (typeof process !== 'undefined' && process.platform === 'win32' 
        ? './logs' 
        : '/var/log/app');
    this.appLogPath = '';
    this.errorLogPath = '';
  }

  public static getInstance(): Logger {
    if (Logger.instance === null) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const fsModule = await import('fs/promises');
      fs = fsModule;
      const pathModule = await import('path');
      path = pathModule;

      if (!path) {
        throw new Error('Failed to load path module');
      }

      this.appLogPath = path.join(this.logDir, 'app.log');
      this.errorLogPath = path.join(this.logDir, 'error.log');

      if (!fs) {
        throw new Error('Failed to load fs/promises module');
      }

      await fs.mkdir(this.logDir, { recursive: true });
      this.initialized = true;
    } catch (e) {
      // Silently fail - logger should not break the app
      // In development, we might want to warn, but in production we should be silent
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('Failed to initialize logger dependencies', e);
      }
    }
  }

  private formatLogEntry(level: string, args: any[]): LogEntry {
    const message = args
      .map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) {
          return `${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
        }
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: args.length > 1 ? args.slice(1) : undefined,
    };
  }

  private formatLogLine(entry: LogEntry): string {
    // Structured text format for Promtail compatibility
    // Format: [TIMESTAMP] [LEVEL] message {metadata}
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level}]`,
      entry.message,
    ];

    if (entry.metadata && entry.metadata.length > 0) {
      try {
        parts.push(JSON.stringify(entry.metadata));
      } catch {
        // If metadata can't be stringified, skip it
      }
    }

    return parts.join(' ') + '\n';
  }

  private async writeToFile(filePath: string, content: string): Promise<void> {
    await this.init();
    if (!fs || !filePath || !this.initialized) return;

    try {
      await fs.appendFile(filePath, content, 'utf8');
    } catch (e) {
      // Silently fail - logger should not break the app
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.error('Logger write failed', e);
      }
    }
  }

  private async log(level: string, ...args: any[]): Promise<void> {
    // Server-side only guard
    if (typeof window !== 'undefined') {
      return; // No-op on client side
    }

    const entry = this.formatLogEntry(level, args);
    const logLine = this.formatLogLine(entry);

    // Write to appropriate log file
    if (level === 'ERROR') {
      await this.writeToFile(this.errorLogPath, logLine);
      // Also write errors to app.log
      await this.writeToFile(this.appLogPath, logLine);
    } else {
      await this.writeToFile(this.appLogPath, logLine);
    }
  }

  async info(...args: any[]): Promise<void> {
    await this.log('INFO', ...args);
  }

  async warn(...args: any[]): Promise<void> {
    await this.log('WARN', ...args);
  }

  async error(...args: any[]): Promise<void> {
    await this.log('ERROR', ...args);
  }

  async debug(...args: any[]): Promise<void> {
    // Only log debug in development
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      await this.log('DEBUG', ...args);
    }
  }
}

// Export singleton instance
// Note: This file should only be imported on server-side
// index.ts handles client-side by providing a no-op logger
export const logger = Logger.getInstance();
