const path = require('path');
import builder from '../build';

import GenericFile from "./file";
import PhpFile from "./php";

class Factory {
  // Cache for keeping track of files (maps filename to file object)
  static cache: { [key: string]: GenericFile } = {};

  /**
   * Create file based on extension (factory)
   * @param {string} ext extension
   * @param {string} parent parent file
   * @param {vinyl} file vinyl file
   * @returns {GenericFile} file
   */
  static createFile (ext: string, parent: string, file): GenericFile {
    let f: GenericFile;
    switch (ext) {
      case '.php':
        f = new PhpFile(parent, file);
        break;
      default:
        f = new GenericFile(parent, file);
        break;
    }
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
  static fillContent(
    parent: string, filename: string,
    include: boolean, once: boolean
  ): string {
    // filename relative to includer
    let file = path.join(path.dirname(parent), filename);

    // create file & build
    if (Factory.cache[file] === undefined) {
      Factory.cache[file] = null;
      try {
        builder.build(undefined, file, parent);
        if (builder.config.watcher) builder.config.watcher.add(file);
      } catch (e) {
      }
    }
    // file doesn't exist
    if (Factory.cache[file] === null) {
      if (include) {
        return "";
      } else {
        throw `Could not open ${file}`;
      }
    }
    // handle _once
    if (once && Factory.cache[file].alreadyIncluded()) {
      Factory.cache[file].addParent(parent);
      return "";
    } else {
      return Factory.cache[file].getContent(parent);
    }
  }

  /**
   * Recursively remove param files that included it (regenerate content)
   * @param filename file path
   */
  static clearIncludes(filename: string) {
    for (let fname in Factory.cache) {
      let f = Factory.cache[fname];
      if (f && f.wasIncludedBy(filename)) {
        f.removeInclude(filename);
        Factory.clearIncludes(fname);
      }
    }
  }

  /**
   * Unwatch loose files and remove cache objects
   */
  static clean() {
    for (let fname in Factory.cache) {
      let f = Factory.cache[fname];
      if (f && !f.alreadyIncluded() && fname !== builder.config.entry) {
        delete Factory.cache[fname];
        if (builder.config.watcher) builder.config.watcher.unwatch(fname);
      }
    }
  }
}

export default Factory;