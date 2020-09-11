import { createFsFromVolume, Volume } from 'memfs';
import path from 'path';
import webpack from 'webpack';
import merge from 'webpack-merge';

import GenericFile from './file';
import { env } from '../global';
import { error } from '../helpers';

let fs;
fs = createFsFromVolume(new Volume());
fs.join = path.join.bind(path);

class WebpackFile extends GenericFile {
  compiler: webpack.Compiler;
  watching: webpack.Compiler.Watching;
  config: webpack.Configuration;

  static defaultConfig: webpack.Configuration = {
    mode: env,
    optimization: {
      minimize: false
    }
  };

  /**
   * File wrapper for javascript files, compiled using webpack
   * @param {string} parent includer
   * @param {vinyl} file vinyl file
   */
  constructor(builder: any, parent: string, file: any, config = undefined) {
    super(builder, parent, file);
    this.updateConfig(config);
    this.compiler = webpack(this.config);
    this.compiler.outputFileSystem = fs;
  }

  /**
   * Set content
   * Might trigger processing depending on file (see subclasses)
   * @param {string} content file content
   * @returns {string} content
   */
  async setContent(content: Buffer): Promise<string> {
    this.dirty = false;
    // is a watcher is in place, webpack will rebuild automatically
    // should only be called once (on include)
    if (this.builder.watchMode) return super.setContent(content);
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
    if (!this.isWatching) {
      this.watching = this.compiler.watch({
        aggregateTimeout: 300
      }, async (err, stats) => {
        try {
          this.buildCB(err, stats);
        } catch (e) {
          return error(e);
        }
        try {
          const content = fs.readFileSync(`${this.file.path}/file`);
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
    if (this.isWatching) {
      this.watching.close(() => {});
      this.isWatching = false;
    }
  }

  /**
   * Merge config files
   * @param config provided config object
   */
  updateConfig(config: webpack.Configuration) {
    const def = WebpackFile.defaultConfig ? WebpackFile.defaultConfig : {};
    this.config = merge(def, config, {
      entry: this.file.path,
      output: { path: this.file.path }, // filename set by implementation
      performance: { hints: false } // disable build info
    } as webpack.Configuration);
  }

  /**
   * Webpack errorhandling callback (watch/run)
   */
  buildCB(err: Error|string, stats: webpack.Stats) {
    // error handling
    if (err) {
      // error((err as Error).stack || err as string);
      throw (err as Error).stack || err as string;
    }
    const info = stats.toString();
    if (stats.hasErrors()) {
      // error(info);
      throw info;
    }
    if (stats.hasWarnings()) {
      error(info);
    }
  }

  /**
   * Update content then build
   * @param {string} content new content
   */
  async update(content: Buffer) {
    console.log(`${this.file.path} changed (webpack)`);
    this.builder.factory.dirty(this.file.path); // make all that include dirty
    await super.setContent(content); // sets self 'clean'
    await this.builder.rebuild();
  }

  /**
   * Build file using webpack.run
   */
  async build() {
    return new Promise<string>((resolve, reject) => {
      this.compiler.run((err, stats) => {
        try {
          this.buildCB(err, stats);
        } catch (e) {
          return reject(e);
        }
        try {
          resolve(fs.readFileSync(`${this.file.path}/file`).toString());
        } catch (err) {
          error(err);
          reject(err);
        }
      });
    });
  }

  /**
   * Register loader names
   */
  static registerLoader(): string[] {
    return ['webpack'];
  }
}

export default WebpackFile;