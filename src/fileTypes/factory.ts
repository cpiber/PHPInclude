import path from 'path';
import builder from '../build';
import { error, env } from '../gulpfile';

import GenericFile from "./file";
import PhpFile from "./php";
import JsFile from "./js";

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
    if (Factory.cache[file.path]) return Factory.cache[file.path];
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
  static async fillContent(
    parent: string, filename: string,
    include: boolean, once: boolean
  ): Promise<string> {
    // filename relative to includer
    const file = path.join(path.dirname(parent), filename);

    // create file & build
    if (!Factory.cache[file] || Factory.cache[file].dirty) {
      try {
        await builder.build(undefined, file, parent);
        Factory.cache[file].watch();
      } catch (e) {
        error(e);
      }
    }

    const f = Factory.cache[file];
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
  static clearIncludes(filename: string) {
    for (const fname in Factory.cache) {
      const f = Factory.cache[fname];
      if (f && f.wasIncludedBy(filename)) {
        f.removeInclude(filename);
        // dangling file, will be deleted when cleaning
        if (!f.includedBy.length) Factory.clearIncludes(fname);
      }
    }
  }

  /**
   * Recursively make dirty (regenerate content)
   * @param filename file path
   */
  static dirty(filename: string) {
    const f = Factory.cache[filename];
    if (!f) return;
    f.dirty = true;

    for (const fname of f.includedBy) {
      Factory.dirty(fname);
    }
  }

  /**
   * Unwatch loose files and remove cache objects
   */
  static clean() {
    for (const fname in Factory.cache) {
      const f = Factory.cache[fname];
      if (f && !f.alreadyIncluded() && fname !== builder.config.entry) {
        Factory.cache[fname].unwatch();
        delete Factory.cache[fname];
      }
    }
  }
}

export default Factory;