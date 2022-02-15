# PHPIncludeRollup

Proof-of-concept implementation for a JavaScript loader with rollup backend.

This loader simply makes a call to rollup when requested. It does not include any watch capability.

For use in projects, it is recommended to instead have a separate build process for non-php files and only include the built file at the end.

## Use

```js
const RollupFile = require('phpincluderollup').default;
// or
import RollupFile from 'phpincluderollup';

/**
 * @type {import('phpinclude/dev').Config}
 */
const config = {
  loaders: [RollupFile],
  extensions: {
    '.js': 'rollup',
  },
};
module.exports = config;
```

rollup can be configured via `rollup.config.js`, `rollup.config.mjs` or `rollup.config.cjs`.