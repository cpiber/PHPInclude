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

## Gulp

You can also use gulp tasks instead of the CLI above. Available tasks: 'build', 'watch'.


## Developing

This project is built using TypeScript, but compiled with Babel.

Install all dependencies: `npm install`.

To compile, run `npm run publish` in the root directory of this repository.

To run the 'watch' gulp task without compiling, run `npm run test` in the root directory. This changes into 'src' and sets the directory to '../test' (see `--cd` above).

Alternatively you can also run any task without compiling (all options available) by changing into the 'src' directory and running `npx gulp <task> -- [options]`.