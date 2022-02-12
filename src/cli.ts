#!/usr/bin/env node

import minimist from 'minimist';
import buildOptions from 'minimist-options';
import Builder from '.';
import { debugLog, error } from './helpers';

const options = buildOptions({
  watch: {
    type: 'boolean',
    alias: 'w',
    default: false,
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
const builder = new Builder(args);

if (args.watch) {
  throw "Watch not supported yet";
} else {
  builder.buildEntry(f, o).then(res => {
    if (!res) debugLog('Finished with errors.');
  });
}