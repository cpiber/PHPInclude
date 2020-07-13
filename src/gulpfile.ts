import gulp from 'gulp';
import watch from 'gulp-watch';

import { argv } from './global';
import { error } from './helpers';
import Builder from './build';

const builder = new Builder();
let watcher;

// configure
// set variables based on arguments
builder.configure(argv);

/**
 * watcher task
 * watches entry file and all includes to rebuild
 */
const Watch = async () => {
  return new Promise<void>(async (resolve, _) => {
    const build = async () => {
      try {
        await builder.rebuild();
      } catch (err) {
        error(err);
        close();
        resolve();
      }
    }

    // watch entry file, other files are added when needed
    console.log(`Watching ${builder.entry}`);
    builder.watcher = watcher = watch(builder.entry, async (file) => {
      builder.factory.dirty(file.path);
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
  return builder.rebuild().catch((err) => error(err));
};

/**
 * Close all watchers
 */
const close = () => {
  watcher.close();
  builder.close();
}

gulp.task('watch', Watch);
gulp.task('build', Build);

export { Watch, Build };