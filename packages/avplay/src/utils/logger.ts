/**
 * Simple logger utility for AVPlay
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

let logLevel: LogLevel = LogLevel.WARN;
const logPrefix = '[AVPlay]';

export function setLogLevel(level: LogLevel): void {
  logLevel = level;
}

export function debug(message: string, ...args: unknown[]): void {
  if (logLevel <= LogLevel.DEBUG) {
    console.debug(`${logPrefix} ${message}`, ...args);
  }
}

export function info(message: string, ...args: unknown[]): void {
  if (logLevel <= LogLevel.INFO) {
    console.info(`${logPrefix} ${message}`, ...args);
  }
}

export function warn(message: string, ...args: unknown[]): void {
  if (logLevel <= LogLevel.WARN) {
    console.warn(`${logPrefix} ${message}`, ...args);
  }
}

export function error(message: string, ...args: unknown[]): void {
  if (logLevel <= LogLevel.ERROR) {
    console.error(`${logPrefix} ${message}`, ...args);
  }
}

export const logger = {
  setLevel: setLogLevel,
  debug,
  info,
  warn,
  error,
};
