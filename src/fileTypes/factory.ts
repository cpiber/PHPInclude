import path from 'path';
import vinyl from 'vinyl';

import Builder from '../build';
import { error } from '../helpers';

import GenericFile from './file';
import Base64File from './base64';
import PhpFile from './php';
import WebpackFile from './webpack';
import JsFile from './js';

class Factory {
  // Cache for keeping track of files (maps filename to file object)
  cache: { [key: string]: GenericFile } = {};
  builder: Builder = undefined;

  // Loaders
  flds: { [key: string]: typeof GenericFile } = {};
  fext: { [key: string]: typeof GenericFile } = {};

  constructor(builder: Builder) {
    this.builder = builder;
  }

  /**
   * Load external extensions
   * @param extensions array of extensions
   */
  loadExtensions(extensions: any[]) {
    const register = (cls: typeof GenericFile) => {
      const loaders = cls.registerLoader();
      loaders && loaders.forEach((l) => { this.flds[l] = cls });
      const exts = cls.registerExt();
      exts && exts.forEach((e) => { this.fext[e] = cls });
    };
    [Base64File, PhpFile, WebpackFile, JsFile].forEach(register);

    extensions.forEach(ext => {
      let f: typeof GenericFile;
      // if it's a function, use it directly, else require
      if (ext instanceof Function) {
        f = ext;
      } else {
        try {
          // try normal require, then with resolved path
          // need to resolve manually because require doesn't respect chdir
          try {
            f = require(ext);
          } catch (err) {
            f = require(path.resolve(ext));
          }
        } catch (err) {
          error(`Extension ${ext} could not be loaded`);
          return;
        }
        // @ts-expect-error
        f = f.default || f;
      }
      register(f);
    });

    this.flds['raw'] = GenericFile;
  }

  /**
   * Create file based on extension (factory)
   * @param {string} ext extension
   * @param {string} parent parent file
   * @param {vinyl} file vinyl file
   * @returns {GenericFile} file
   */
  createFile(parent: string, file: vinyl, name: string): GenericFile {
    if (this.cache[name]) return this.cache[name];
    let f: GenericFile;
    const ext_ = path.extname(name);
    const [_, ext, loader] = /\.([\w\d]+)(?:!([\w\d]+))?/.exec(ext_);

    if (loader) {
      if (loader in this.flds) {
        this.builder.debugLog(`Using loader: ${loader}`);
        f = new this.flds[loader](this.builder, parent, file);
      } else {
        this.builder.debugLog(`Loader ${loader} not found`);
      }
    }
    if (!f && ext && ext in this.fext) {
      this.builder.debugLog(`Using extension: ${ext}`);
      f = new this.fext[ext](this.builder, parent, file);
    }
    if (!f) {
      this.builder.debugLog('Using default loader');
      f = new GenericFile(this.builder, parent, file);
    }

    this.cache[name] = f;
    return f;
  }

  /**
   * Adds file to cache and builds it
   * Skipped if once and already included
   * @param {string} parent includer
   * @param {string} filename file path
   * @param {boolean} include include or require
   * @param {boolean} once _once?
   * @returns {string} content
   */
  async fillContent(
    parent: string, filename: string,
    include: boolean, once: boolean
  ): Promise<string> {
    // filename relative to includer
    const file = path.join(path.dirname(parent), filename);

    // create file & build
    if (!this.cache[file] || this.cache[file].dirty) {
      try {
        await this.builder.build(undefined, file, parent);
        if (this.builder.watchMode) this.cache[file].watch();
      } catch (e) {
        error(e);
      }
    }

    const f = this.cache[file];
    // file doesn't exist
    if (!f) {
      if (include) {
        return Promise.resolve('');
      } else {
        return Promise.reject(''); //`Could not open ${file}`);
      }
    }
    // handle _once
    f.addParent(parent);
    if (once && f.alreadyIncluded()) {
      return Promise.resolve(f.genContent());
    } else {
      return Promise.resolve(f.getContent(parent));
    }
  }

  /**
   * Remove files were included by param (regenerate content)
   * @param filename file path
   */
  clearIncludes(filename: string) {
    for (const fname in this.cache) {
      const f = this.cache[fname];
      if (f && f.wasIncludedBy(filename)) {
        f.removeInclude(filename);
        // dangling file, will be deleted when cleaning
        // if (!f.includedBy.length) this.clearIncludes(fname);
      }
    }
  }

  /**
   * Recursively make dirty (regenerate content)
   * @param filename file path
   */
  dirty(filename: string) {
    const f = this.cache[filename];
    if (!f) return;
    f.dirty = true;

    for (const fname of f.includedBy) {
      this.dirty(fname);
    }
  }

  /**
   * Unwatch loose files and remove cache objects
   */
  clean() {
    let done = false;
    while (!done) {
      done = true;
      for (const fname in this.cache) {
        const f = this.cache[fname];
        if (f && !f.alreadyIncluded() && !f.persistent) {
          this.clearIncludes(fname);
          if (this.builder.watchMode) this.cache[fname].unwatch();
          delete this.cache[fname];
          done = false; // potentially new dangling files from clear above
        }
      }
    }
  }
}

export default Factory;