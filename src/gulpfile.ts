const path = require('path'),
  gulp = require('gulp'),
  webpack = require('webpack'),
  watch = require('gulp-watch'),
  transform = require('gulp-transform');

const argv = require('minimist')(process.argv);
import builder from './build';

if (argv.cd) process.chdir(argv.cd);
builder.config.entry = (argv.entry ? argv.entry : 'src/index.php');
builder.config.entry = path.resolve(builder.config.entry);
builder.config.src = path.resolve(argv.src ? argv.src : 'src');
builder.config.build = argv.dest ? argv.dest : 'build';
console.log(builder.config.src);

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

gulp.task('watch', (cb) => { Watch(); cb(); });
gulp.task('build', (cb) => { Build(); cb(); });

export { Watch, Build };