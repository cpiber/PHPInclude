import { Location as PLocation } from 'php-parser';
import { env } from './global';

interface Location extends PLocation {
  file?: string;
}

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
const warn = (msg: string, loc?: Location) => console.warn(`WARNING:${loc && (locToString(loc) + ':') || ''} ${msg}!`);

/**
 * Log if in debug mode
 * @param args things to log
 */
const debugLog: typeof console.log = (...args) => isDev() && console.log.apply(console, ['DEBUG:', ...args]);

/**
 * Stringify php-parser location
 * @param locaction to print
 * @returns stringified location
 */
const locToString = (loc: Location, file?: string) => `${loc.file || file || '[unkown]'}:${loc.start.line}:${loc.start.column}`;

export { isDev, error, warn, debugLog, locToString, Location };
