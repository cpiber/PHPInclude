# PHPInclude

The main application code. See [the top-level readme](../../README.md) for more information.

## Developing

PHPInclude also exposes a Node-API.

```ts
import Builder from 'phpinclude'; // main builder class
import { runBuild, watchBuild } from 'phpinclude/cli'; // cli helpers
import {
  BuildFile, Base64File, PhpFile, PlainFile,
  argv, env,
  isDev, error, warn, debugLog, locToString
} from 'phpinclude/dev'; // development helpers
import type { BuildFileSubclass, Location, Config, Configurable } from 'phpinclude/dev'; // development types
```

Functions and classes are documented in the code.

For a proof-of-concept implementation of a loader, see [PHPIncludeRollup](../PHPIncludeRollup/README.md).