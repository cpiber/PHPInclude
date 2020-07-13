import path from 'path';

import Builder from '../build';
import { error } from '../helpers';

import GenericFile from './file';
import PhpFile from './php';
import JsFile from './js';

class Factory {
  // Cache for keeping track of files (maps filename to file object)
  cache: { [key: string]: GenericFile } = {};
  builder: Builder = undefined;

  constructor(builder: Builder) {
    this.builder = builder;
  }

  /**
   * Create file based on extension (factory)
   * @param {string} ext extension
   * @param {string} parent parent file
   * @param {vinyl} file vinyl file
   * @returns {GenericFile} file
   */
  createFile(ext: string, parent: string, file): GenericFile {
    if (this.cache[file.path]) return this.cache[file.path];
    let f: GenericFile;
    switch (ext) {
      case '.php':
        f = new PhpFile(parent, file);
        break;
      case '.js':
        f = new JsFile(parent, file);
        break;
      default:
        f = new GenericFile(parent, file);
        break;
    }
    f.builder = this.builder;
    this.cache[file.path] = f;
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
        return Promise.resolve(f.genContent());;
      } else {
        return Promise.reject(`Could not open ${file}`);
      }
    }
    // handle _once
    if (once && f.alreadyIncluded()) {
      f.addParent(parent);
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
        if (!f.includedBy.length) this.clearIncludes(fname);
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
    for (const fname in this.cache) {
      const f = this.cache[fname];
      if (f && !f.alreadyIncluded() && !f.persistent) {
        if (this.builder.watchMode) this.cache[fname].unwatch();
        delete this.cache[fname];
      }
    }
  }
}

export default Factory;