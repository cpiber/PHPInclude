#!/usr/bin/env node

import { watch } from 'chokidar';
import minimist from 'minimist';
import buildOptions from 'minimist-options';
import { performance } from 'perf_hooks';
import Builder from '.';
import { debugLog, error } from './helpers';

const options = buildOptions({
  watch: {
    type: 'boolean',
    alias: 'w',
    default: false,
  },
  config: {
    type: 'string',
    alias: 'c',
  },
  help: 'boolean',
});
options.stopEarly = true;
options.unknown = arg => {
  if (!arg.startsWith('-')) return true;
  error(`Unkown argument \`${arg}\``);
  process.exit(1);
};
const args = minimist(process.argv.slice(2), options);
if (args.help) {
  console.log('phpinclude [--watch] [<input file>] [<output file>]');
  console.log('  <input file>:   File to use as entry point. Default: src/index.php');
  console.log('  <output file>:  Where to output final result. Default: dest/index.php');
  console.log('Options:');
  console.log('  --watch, -w:    Watch files instead of single build. Default: false');
  process.exit(0);
}
const f = args._.shift() || 'src/index.php';
const o = args._.shift() || 'dest/index.php';
if (args._.length) {
  error('Too many positional arguments!');
  process.exit(1);
}

const timedCall = <T>(promise: Promise<T>) => {
  const start = performance.now();
  return promise
    .then(value => ({ value, time: performance.now() - start }))
    .catch(reason => Promise.reject({ reason, time: performance.now() - start }));
};

export const runBuild = async (builder: Builder, entryfile: string, outputfile: string) => {
  const { value: res, time } = await timedCall(builder.buildEntry(entryfile, outputfile));
  if (!res) debugLog('Finished with errors.');
  else console.log(`Build finished successfully in ${time.toFixed(2)}ms.`);
};

export const watchBuild = async (builder: Builder, entryfile: string, outputfile: string) => {
  const watcher = watch([], {
    // awaitWriteFinish: true,
  });
  const rebuild = async (path: string) => {
    const { value: res, time } = await timedCall(builder.rebuildFile(path).then(res => res && builder.rebuildWithEntry(entryfile, outputfile)));
    if (res) {
      console.log(`Rebuild finished successfully in ${time.toFixed(2)}ms.`);
    } else {
      console.error(`Encountered an error while building file \`${path}\``);
    }
  }
  watcher.on('change', rebuild);
  watcher.on('unlink', rebuild);
  builder.on('file-added', (file: string) => watcher.add(file));
  builder.on('built', (file: string) => debugLog(`Built file \`${file}\` successfully.`));
  await runBuild(builder, entryfile, outputfile);
  return watcher;
};

try {
  const builder = new Builder(args);
  if (args.watch) {
    watchBuild(builder, f, o);
  } else {
    runBuild(builder, f, o);
  }
} catch (e) {
  error(e);
}