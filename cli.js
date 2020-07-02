#!/usr/bin/env node

require('@babel/register')({ extensions: [".ts"] });
const argv = require('minimist')(process.argv);

const { Watch, Build } = require('./gulpfile.ts');

if (argv.watch) {
  Watch();
} else {
  Build();
}