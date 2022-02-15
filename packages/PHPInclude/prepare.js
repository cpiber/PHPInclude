const { dirname, resolve } = require('path');
const { get } = require('https');
const { createWriteStream } = require('fs');

const types = resolve(dirname(require.resolve('php-parser')), '../types.d.ts');
const newtypes = 'https://raw.githubusercontent.com/cpiber/php-parser/patch-typing/types.d.ts';
get(newtypes, res => {
  const f = createWriteStream(types);
  res.pipe(f);
  f.on('finish', () => {
    f.close();
    console.log(`Types updated!`);
  });
}).on("error", err => {
  console.error("Error: ", err.message);
});