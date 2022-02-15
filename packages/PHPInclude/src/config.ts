import isCallable from 'is-callable';
import { resolve } from 'path';
import type { BuildFileSubclass } from './filetypes';

interface Config {
  loaders?: BuildFileSubclass[];
  extensions?: Record<string, string>;
}
type Configurable = Config | ((a?: import('minimist').ParsedArgs) => Config);

function isObject(obj: unknown): obj is Record<string, any> { return obj !== null && obj === Object(obj) && !Array.isArray(obj); }
function isFileLoader(obj: unknown): obj is BuildFileSubclass {
  if (!isObject(obj)) return false;
  if (obj['length'] > 1) return false;
  if (!isObject(obj['prototype'])) return false;
  if (!isCallable(obj['prototype']['process'])) return false;
  if (obj['prototype']['process'].length !== 2) return false;
  for (const fn of ['getFilename', 'getContents', 'isPresent', 'registerIncludes', 'removeAbandoned', 'putEntry']) {
    if (!isCallable(obj['prototype'][fn])) return false;
    if (obj['prototype'][fn].length !== 0) return false;
  }
  if (!isCallable(obj['getName'])) return false;
  if (obj['getName'].length !== 0) return false;
  return true;
}
function verifyConfig(conf: unknown): asserts conf is Config {
  if (!isObject(conf)) throw 'given config is not an object';
  if ('loaders' in conf) {
    const loaders = conf['loaders'];
    if (loaders === null || !Array.isArray(loaders)) throw '`loaders` is not an array';
    loaders.forEach((loader, i) => {
      if (!isFileLoader(loader)) throw `\`loaders\` index ${i} is not a proper file loader`;
    });
  }
  if ('extensions' in conf) {
    const exts = conf['extensions'];
    if (!isObject(exts)) throw '`extensions` is not an object';
  }
  const unkown = Object.getOwnPropertyNames(conf).filter(name => name !== 'extensions' && name !== 'loaders').map(name => `\`${name}\``).join(', ');
  if (unkown.length) throw `unkown property(s) ${unkown}`;
}
function loadConfig(path: string, args?: import('minimist').ParsedArgs) {
  let config = require(resolve(path));
  if (isCallable(config)) config = config(args);
  verifyConfig(config);
  return config;
}

export { Config, Configurable, verifyConfig, isFileLoader, loadConfig };
