import { env } from './global';

/**
 * @returns whether program is in debug mode
 */
const isDev = () => env !== 'production';

/**
 * helper for error printing
 * @param {string | Error} error to print
 */
const error = (error: string | Error | unknown, title?: string) => {
  let msg = error instanceof Error ? error.message : error;
  if (!msg) return;
  if (title) msg = title + '\n' + msg;
  console.error(`  == ERROR ==\n${msg}`);
  if (isDev() && error instanceof Error) {
    console.log('\nFull error:');
    console.log(error);
  }
}

/**
 * helper for warning printing
 * @param {string} warning to print
 */
const warn = (msg: string) => {
  console.warn(`WARNING: ${msg}!`);
}

/**
 * Log if in debug mode
 * @param args things to log
 */
const debugLog: typeof console.log = (...args) => isDev() && console.log.apply(console, args);

export { isDev, error, warn, debugLog };
