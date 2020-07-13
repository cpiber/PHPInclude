# PHPInclude

A tool for packaging php files into one.

Resolves includes and packages files into one big file. Useful for single-file installs.


## Usage

- Build file: `phpinclude [options]`
- Watch file: `phpinclude --watch [options]`

### Options

- Entry file: `--entry <file>`. Default: `index.php`
- Source directory: `--src <folder>`. Default: `src`
- Destination directory: `--dest <folder>`. Default: `build`
- Working directory: `--cd <folder>`. Default: `$PWD`

## Loaders

This project understands a handful of files.

For example in a php file, all `require`/`include` calls are resolved and recursively added to the build file.

Available loaders:
- `php` (matches includes via regex)
- `js` (using webpack)
- raw (include text as-is)

## Gulp

You can also use gulp tasks instead of the CLI above. Available tasks: 'build', 'watch'.


## Developing

This project is built using TypeScript and compiled with Babel.

Install all dependencies: `npm install`.

To compile, run `npm run prepare` or `npm install` in the root directory of this repository.

To run the 'watch' gulp task without compiling, run `npm run test` in the root directory.

To run the 'build' gulp task without compiling, run `npm run testbuild` in the root directory.

Alternatively you can also run any task without compiling (all options available) by changing into the 'src' directory and running `npx gulp <task> -- [options]`.