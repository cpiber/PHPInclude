import { env } from './global';

/**
 * helper for error printing
 * @param {string | Error} error to print
 */
const error = (error: string | Error) => {
  console.error(`== ERROR ==
    ${error instanceof Error ? error.message : error}`);
  if (env !== 'production' && error instanceof Error) {
    console.log('Full error:', error);
  }
}

export { error };