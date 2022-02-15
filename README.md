# PHPInclude

A tool for packaging php files into one.

Resolves includes and packages files into one big file. Useful for single-file installs.


## Usage

- Build file: `phpinclude [options] [<input file>] [<output file>]`
- Watch file: `phpinclude --watch [options] [<input file>] [<output file>]`

For more information see `phpinclude --help`.

Note: if you installed locally, you will probably have to prefix commands in the terminal with `npx`, i.e. `npx phpinclude ...`.

### Example

- Build `src/index.php` to `dest/index.php`: `phpinclude`
- Build `src/main.php` to `dest/index.php`: `phpinclude src/main.php`
- Build `src/main.php` to `dest/main.php`: `phpinclude src/main.php dest/main.php`
- Build `src/main.php` to `dest/main.php` and watch: `phpinclude -w src/main.php dest/main.php`

## Loaders

This project understands a handful of files.

For example in a php file, all `require`/`include` calls are resolved and recursively added to the build file.

Available loaders:
- `php` (parses PHP ast and resolves includes and globals)
- `plaintext` (loads file contents and returns as string)
- `base64` (loads file contents and returns as base64-encoded string)

These are mapped by default to the following file extensions:
| extension | name        |
|-----------|-------------|
| `.php`    | `php`       |
| `.txt`    | `plaintext` |
| `.js`     | `plaintext` |
| `.bin`    | `base64`    |

Loaders and mappings can be changed via [configuration files](#configuration-files).

## Configuration files

This application can be configured with the use of configuration files. Configuration files must be valid javascript. They may either export a configuration object, or a function that returns a configuration object.

The following object is expected:

```ts
{
  loaders?: BuildFileSubclass[],
  extensions?: Record<string, string>,
}
```

A loader must extend the abstract class [`BuildFile`](src/filetypes/file.ts). Later loaders have priority, i.e. user-defined loaders may override built-in loaders by specifying the same name.

The extensions object should map a file extension (e.g. `.php`) to the name of a loader. The special value `null` may be used to remove existing loaders for the file extension.

### Example

```js
module.exports = {
  extensions: {
    '.bin' : 'plaintext',
  },
};
```

or

```js
module.exports = args => ({
  extensions: {
    '.bin' : 'plaintext',
  },
});
```