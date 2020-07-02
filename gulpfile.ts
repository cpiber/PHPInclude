const fs = require('fs'),
  path = require('path'),
  gulp = require('gulp'),
  webpack = require('webpack'),
  watch = require('gulp-watch'),
  transform = require('gulp-transform');

const argv = require('minimist')(process.argv.slice(3));
const builder = require('./build.ts');


builder.config.entry = (argv.entry ? argv.entry : 'src/index.php');
builder.config.entry = path.resolve(builder.config.entry);

builder.config.src = path.resolve("src");

gulp.task('watch', () => {
  // watch entry file, other files are added
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
});

gulp.task('build', () => {
  return builder.build();
});
