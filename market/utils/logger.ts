// src/utils/logger.ts

import fs from 'fs';
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const LOG_CONFIG = {
  ROTATION_INTERVAL: '6h',    // Frequency of rotation
  MAX_FILE_SIZE: '100m',      // Max file size 100MB
  MAX_FILES: '7d',           // Keep logs for 7 days
  DATE_PATTERN: 'YYYY-MM-DD-HH'  // Include hours in filename for 6h rotation
} as const;

class Logger {
  private logger: winston.Logger;
  private static errorLogFilePath: string;
  private scriptName: string;

  constructor(scriptName: string) { // Accept scriptName as a parameter
    this.scriptName = scriptName;
    const logDir = this.getLogDirectory();

    // Ensure the scriptName is safe for filenames
    const safeScriptName = this.makeSafeFilename(this.scriptName);

    // Define custom colors for log levels
    const customColors: winston.config.AbstractConfigSetColors = {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'magenta',
      debug: 'blue',
    };

    // Apply the custom colors to Winston
    winston.addColors(customColors);

    // Create a new Winston logger instance
    this.logger = winston.createLogger({
      level: 'debug', // Set to 'debug' so all logs are recorded
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] [${level.toUpperCase()}] [${this.scriptName}] ${
            typeof message === 'object' ? JSON.stringify(message, null, 2) : message
          }`;
        })
      ),
      transports: [
        new winston.transports.Console({
          level: 'info', // Console will show 'info' and above (info, warn, error)
          format: winston.format.combine(
            winston.format.colorize({ all: true }), // Apply colors to all parts
            winston.format.printf(({ timestamp, level, message }) => {
              return `[${timestamp}] [${level}] [${this.scriptName}] ${message}`;
            })
          ),
        }),
        new DailyRotateFile({
          filename: path.join(logDir, `${safeScriptName}-%DATE%.log`),
          datePattern: LOG_CONFIG.DATE_PATTERN,
          maxFiles: LOG_CONFIG.MAX_FILES,
          maxSize: LOG_CONFIG.MAX_FILE_SIZE,
          frequency: LOG_CONFIG.ROTATION_INTERVAL,
          auditFile: path.join(logDir, '.audit.json'), // Tracks rotation history
        }),
      ],
      exitOnError: false, // Do not exit on handled exceptions
    });

    if (!Logger.errorLogFilePath) {
      Logger.errorLogFilePath = path.join(logDir, 'error.log');
    }
  }

  private getLogDirectory(): string {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return logDir;
  }

  // Helper method to sanitize script names for filenames
  private makeSafeFilename(name: string): string {
    return name.replace(/[^a-z0-9_\-]/gi, '_');
  }

  /**
   * Formats multiple arguments into a single string.
   * Objects are stringified with indentation for readability.
   * @param args - An array of arguments to format.
   * @returns A single formatted string.
   */
  private formatArgs(args: any[]): string {
    return args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg)).join(' ');
  }

  /**
   * Logs an informational message.
   * @param args - Multiple arguments to log.
   */
  public info(...args: any[]): void {
    const message = this.formatArgs(args);
    this.logger.info(message);
  }

  /**
   * Logs a debug message.
   * @param args - Multiple arguments to log.
   */
  public debug(...args: any[]): void {
    const message = this.formatArgs(args);
    this.logger.debug(message);
    if (process.env.DEBUG_MODE === 'true') {
      this.logger.log('debug', message);
    }
  }

  /**
   * Logs a warning message.
   * @param args - Multiple arguments to log.
   */
  public warn(...args: any[]): void {
    const message = this.formatArgs(args);
    this.logger.warn(message);
  }

  /**
   * Logs an error message and writes it to a file.
   * @param args - Multiple arguments to log.
   */
  public error(...args: any[]): void {
    const message = this.formatArgs(args);
    this.logger.error(message);
    this.writeToFile(Logger.errorLogFilePath, message);
  }

  /**
   * Writes an error message to a designated error log file.
   * @param filePath - The path to the error log file.
   * @param message - The error message to write.
   */
  private writeToFile(filePath: string, message: string): void {
    const logMessage = `[${new Date().toISOString()}] [ERROR] [${this.scriptName}] ${message}\n`;
    fs.appendFileSync(filePath, logMessage);
  }

  /**
   * Sets the debug mode for logging.
   * @param state - Boolean indicating whether to enable or disable debug mode.
   */
  public setDebugMode(state: boolean): void {
    process.env.DEBUG_MODE = state ? 'true' : 'false';
  }
}

export default Logger;
