const fs = require('fs'),
  path = require('path'),
  gulp = require('gulp'),
  webpack = require('webpack'),
  watch = require('gulp-watch'),
  transform = require('gulp-transform');

const argv = require('minimist')(process.argv);
import builder from './build';


builder.config.entry = (argv.entry ? argv.entry : 'src/index.php');
builder.config.entry = path.resolve(builder.config.entry);

builder.config.src = path.resolve("src");

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
  // build initially
  builder.build();
  builder.config.watchFile = undefined;

  // add build transform
  builder.config.watcher.pipe(transform('utf8', builder.build));
  return builder.config.watcher;
};
const Build = () => {
  return builder.build();
};

gulp.task('watch', Watch);
gulp.task('build', Build);

export { Watch, Build };