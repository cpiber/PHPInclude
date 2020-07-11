import { createFsFromVolume, Volume } from 'memfs';
import path from 'path';
import webpack from 'webpack';

import GenericFile from './file';
import Factory from './factory';
import { error } from '../gulpfile';
import builder from '../build';

let fs;
fs = createFsFromVolume(new Volume());
fs.join = path.join.bind(path);

class JsFile extends GenericFile {
  compiler: webpack.Compiler;
  watching: webpack.Compiler.Watching;

  /**
   * File wrapper for javascript files, compiled using webpack
   * @param {string} parent includer
   * @param {vinyl} file vinyl file
   */
  constructor(parent: string, file: any) {
    super(parent, file);
    this.compiler = webpack({
      entry: file.path,
      output: {
        path: file.path,
        filename: 'f.js'
      },
      mode: builder.config.watcher ? 'development' : 'production',
      performance: { hints: false } // disable build info
    });
    this.compiler.outputFileSystem = fs;
  }

  /**
   * Set content
   * Might trigger processing depending on file (see subclasses)
   * @param {string} content file content
   * @returns {string} content
   */
  async setContent(content: string): Promise<string> {
    // is a watcher is in place, webpack will rebuild automatically
    // should only be called once (on include)
    if (builder.config.watcher) return super.setContent(content);
    // else compile using webpack
    try {
      const c = await this.build();
      this.contents = c;
      return Promise.resolve(this.contents);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Watch file
   * Uses webpack
   */
  watch() {
    // check if in watch mode
    if (builder.config.watcher && !this.isWatching) {
      this.watching = this.compiler.watch({
        aggregateTimeout: 300
      }, async (err, stats) => {
        const ret = this.buildCB(err, stats);
        if (ret !== "") return error(ret);
        try {
          const content = fs.readFileSync(`${this.file.path}/f.js`).toString();
          await this.update(content);
        } catch (err) {
          error(err);
        }
      });
      this.isWatching = true;
    }
  }

  /**
   * Unwatch file
   * For most files default watcher
   */
  unwatch() {
    if (builder.config.watcher && this.isWatching) {
      this.watching.close(() => {});
      this.isWatching = false;
    }
  }

  /**
   * Webpack errorhandling callback (watch/run)
   */
  buildCB(err, stats): string {
    // error handling
    if (err) {
      error(err.stack || err);
      return err.stack || err;
    }
    const info = stats.toString();
    if (stats.hasErrors()) {
      error(info);
      return info;
    }
    if (stats.hasWarnings()) {
      error(info);
    }
    // rebuild
    return "";
  }

  /**
   * Update content then build
   * @param {string} content new content
   */
  async update(content: string) {
    await super.setContent(content);
    await builder.rebuild();
  }

  /**
   * Build file using webpack.run
   */
  async build() {
    return new Promise<string>((resolve, reject) => {
      this.compiler.run((err, stats) => {
        const ret = this.buildCB(err, stats);
        if (ret !== "") return reject(ret);
        try {
          resolve(fs.readFileSync(`${this.file.path}/f.js`).toString());
        } catch (err) {
          error(err);
          reject(err);
        }
      });
    });
  }
}

export default JsFile;