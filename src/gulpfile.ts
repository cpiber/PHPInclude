const path = require('path'),
  gulp = require('gulp'),
  webpack = require('webpack'),
  watch = require('gulp-watch'),
  transform = require('gulp-transform');

const argv = require('minimist')(process.argv);
const env = process.env.NODE_ENV || 'production';
import builder from './build';

interface fn { (): void };

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
const Watch = () => {
  // watch entry file, other files are added
  console.log(`Watching ${builder.config.entry}`);
  builder.config.watcher = watch(builder.config.entry, () => {
    if (builder.config.watchFile !== builder.config.entry) {
      builder.config.watchFile = builder.config.entry;
      console.log('Building entry:');
      builder.build();
    }
    builder.clean();
    builder.config.watchFile = undefined;
  });
  // build now
  builder.build();
  builder.config.watchFile = undefined;

  // add build transform
  builder.config.watcher.pipe(transform('utf8', builder.build));
  return builder.config.watcher;
};
/**
 * build task
 * resolve includes once, currently no build optimisations
 */
const Build = () => {
  return builder.build();
};

/**
 * helper for error printing
 * @param {string | Error} error to print
 */
const error = (error: string | Error) => {
  console.error(error instanceof Error ? error.message : error);
  if (env != 'production' && error instanceof Error) {
    console.log('Full error:', error);
  }
}
/**
 * helper to wrap gulp tasks in error-catcher and call callback
 * @param {(): void} task task function
 * @param {(): void} cb callback (gulp), optional
 * @param {(): void} err error callback, optional
 */
const wrap = (task: fn, cb: fn = () => { }, err: fn = () => { }) => {
  try {
    task();
  } catch (e) {
    error(e);
    err();
  }
  cb();
}

gulp.task('watch', (cb: fn) => wrap(Watch, () => { }, () => {
  builder.config.watcher.close();
  cb();
}) );
gulp.task('build', (cb: fn) => wrap(Build, cb) );

export { Watch, Build, error };