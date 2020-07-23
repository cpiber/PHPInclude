import fs from 'fs';
import path from 'path';
import vinyl from 'vinyl';
import gulp from 'gulp';
import minimist from 'minimist';
import buildOptions from 'minimist-options';
import { Readable } from 'stream';

import FileFactory from './fileTypes/factory';

class Builder {
  watcher = undefined;
  watchMode = false;
  factory: FileFactory;

  entry = "index.php";
  src_dir = "src";
  build_dir = "build";
  debug = false;
  extensions = [];
  argv = undefined;

  static fname = /([A-Za-z0-9.\\\/]+)(?:!.+)?/;

  constructor(args: any) {
    this.factory = new FileFactory(this);
    this.configure(args);
  }

  /**
   * Minimal configuration
   * @param args config
   */
  configure(args: any) {
    args = minimist(args, buildOptions({
      debug: {
        type: 'boolean',
        default: this.debug
      },
      extensions: {
        type: 'string-array',
        alias: 'ext'
      },
      entry: { type: 'string' },
      src: { type: 'string' },
      dest: { type: 'string' },
    }));
    this.debug = args.debug;
    this.argv = args;

    // load config, change directory, load new config
    const isAbs = args.config !== undefined && path.isAbsolute(args.config);
    try {
      this.loadConfig(args.config);
    } catch (err) { this.debugLog(err); }
    if (args.cd) {
      process.chdir(args.cd);
      try {
        if (!isAbs) this.loadConfig(args.config); // load once if absolute path
      } catch (err) { this.debugLog(err); }
    }

    // configure from argv
    this.src_dir = args.src || this.src_dir;
    this.entry = this.src_dir + path.sep + (args.entry || this.entry);
    this.entry = path.resolve(this.entry);
    this.src_dir = path.resolve(this.src_dir);
    this.build_dir = args.dest || this.build_dir;
    this.extensions = this.extensions.concat(args.extensions);

    this.factory.loadExtensions(this.extensions);
  }

  /**
   * Load config file
   * @param {string} name file name
   */
  loadConfig(name: string = undefined) {
    if (name === undefined) {
      // try loading .js/.json config files
      try {
        return this.loadConfig('phpinclude.js');
      } catch (err) { this.debugLog(err); }
      try {
        return this.loadConfig('phpinclude.json');
      } catch (err) { this.debugLog(err); }
      return;
    }

    const isAbs = path.isAbsolute(name);
    const cpath = path.resolve(isAbs ? name : `.${path.sep}${name}`);
    let content;
    try {
      content = require(cpath);
    } catch (err) {
      throw `Config ${name} could not be loaded`;
    }
    let config;
    if (content instanceof Function) {
      config = content(this.argv);
    } else {
      config = content;
    }
    if (typeof config !== 'object' || config === null) {
      this.debugLog(config);
      throw 'Return not valid (must be non-null object)';
    }

    // load
    this.entry = config.entry || this.entry;
    this.src_dir = config.src || this.src_dir;
    this.build_dir = config.dest || this.build_dir;
    this.extensions = this.extensions.concat(config.extensions || []);
  }

  /**
   * Build file
   * @param {string} content file content
   * @param {vinyl|string} file vinyl file or string (path)
   * @param {string} parent parent file
   * @returns {string} new content
   */
  async build(
    content: string = undefined,
    filename: vinyl|string = undefined,
    parent: string = undefined
  ): Promise<string> {
    if (!this.entry) return;
    if (!fs.existsSync(this.build_dir)) fs.mkdirSync(this.build_dir);
    
    let file: vinyl;
    let _, fname = filename as string;
    const isFilename = filename && typeof filename === "string";
    if (isFilename || !content) {
      filename = isFilename ? filename : this.entry;
      [_, fname] = Builder.fname.exec(filename as string);
      try {
        content = fs.readFileSync(fname).toString();
      } catch (err) {
        this.debugLog(err);
        return Promise.reject(
          `${isFilename ? 'File' : 'Entry'} ${fname} doesn't exist`);
      }
      file = new vinyl({ path: path.resolve(fname) });
    } else {
      file = filename as vinyl;
    }
    
    this.factory.clearIncludes(file.path);
    
    console.log('Building', file.path);
    const f = this.factory.createFile(parent, file, filename as string);
    f.persistent = file.path === this.entry;
    return f.setContent(content);
  }

  /**
   * Rebuild
   * Used by watcher
   */
  async rebuild() {
    console.log('Building entry:');
    const content = await this.build();

    return new Promise<string>((resolve, reject) => {
      let out = new Readable({ objectMode: true });
      const builder = this;
      out._read = function () {
        this.push(new vinyl({
          cwd: builder.src_dir,
          path: builder.entry,
          contents: Buffer.from(content)
        }));
        this.push(null);
      };
      out.pipe(gulp.dest(this.build_dir));
      out.on('end', () => resolve(content));
      out.on('error', reject);
    }).then(
      (value)  => { this.clean(); return Promise.resolve(value); },
      (reason) => {
        this.clean();
        this.debugLog(reason);
        return Promise.reject(reason);
      }
    ); // add clean step without modifying promise content
  }

  /**
   * Unwatch unneeded files and clean up
   * Forwarded to Factory
   */
  clean() {
    this.factory.clean();
  }

  /**
   * Unwatch all files
   */
  close() {
    for (const fname in this.factory.cache) {
      this.factory.cache[fname].unwatch();
    }
  }

  /**
   * Log in debug mode
   * @param content msg to log
   */
  debugLog(content: any) {
    if (this.debug) console.debug(content);
  }
}

export default Builder;