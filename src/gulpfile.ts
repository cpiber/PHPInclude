import path from 'path';
import gulp from 'gulp';
import watch from 'gulp-watch';

const argv = require('minimist')(process.argv);
const env = process.env.NODE_ENV || 'production';
import builder from './build';
import FileFactory from './fileTypes/factory';

// configure
// set variables based on arguments
if (argv.cd) process.chdir(argv.cd);
builder.config.entry = (argv.src ? argv.src : 'src') + '/'
  + (argv.entry ? argv.entry : 'index.php');
builder.config.entry = path.resolve(builder.config.entry);
builder.config.src = path.resolve(argv.src ? argv.src : 'src');
builder.config.build = argv.dest ? argv.dest : 'build';

/**
 * watcher task
 * watches entry file and all includes to rebuild
 */
const Watch = async () => {
  return new Promise<void>(async (resolve, reject) => {
    const build = async () => {
      try {
        await builder.rebuild();
      } catch (err) {
        error(err);
        builder.config.watcher.close();
        resolve();
      }
    }

    // watch entry file, other files are added
    console.log(`Watching ${builder.config.entry}`);
    builder.config.watcher = watch(builder.config.entry, async (file) => {
      FileFactory.dirty(file.path);
      await build();
    });
    // first build
    await build();
  });
};
/**
 * build task
 * resolve includes once, currently no build optimisations
 */
const Build = async () => {
  return builder.build().catch((err) => error(err));
};

/**
 * helper for error printing
 * @param {string | Error} error to print
 */
const error = (error: string | Error) => {
  console.error(`== ERROR ==
    ${error instanceof Error ? error.message : error}`);
  if (env != 'production' && error instanceof Error) {
    console.log('Full error:', error);
  }
}

gulp.task('watch', Watch);
gulp.task('build', Build);

export { Watch, Build, error, env };