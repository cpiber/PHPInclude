const path = require('path');
import builder from '../build';

interface fileObj { path?: string; }; // reduced vinyl

class GenericFile {
  file: fileObj = undefined;
  contents = "";
  includedBy = [];
  isIncluded: undefined|string = undefined;

  // Cache for keeping track of files (maps filename to file object)
  static cache: { [key: string]: GenericFile } = {};

  /**
   * File wrapper for manipulating content
   * @param {string} parent Includer
   * @param {vinyl} file vinyl file
   */
  constructor(parent: string, file: fileObj) {
    if (parent) this.includedBy.push(parent); // parent is the includer
    this.file = file;
    GenericFile.cache[file.path] = this;
  }

  /**
   * Set content
   * Might trigger processing depending on file (see subclasses)
   * @param {string} content File content
   * @returns {string} content
   */
  setContent(content: string): string {
    this.contents = content;
    return this.contents;
  }

  /**
   * Get content and set parent as including file
   * @param {string} parent Includer
   * @returns {string} content
   */
  getContent(parent: string): string {
    this.addParent(parent);
    return this.contents;
  }

  /**
   * Check if file was included by param
   * @param {string} parent file to check
   * @returns {boolean} was included
   */
  wasIncludedBy(parent: string): boolean {
    return this.includedBy.indexOf(parent) !== -1;
  }

  /**
   * Check if file is included anywhere
   * @returns {boolean} was included
   */
  alreadyIncluded(): boolean {
    return this.isIncluded !== undefined;
  }

  /**
   * Add param to list of including files
   * Sets as primary includer if not set (_once variants)
   * @param parent includer
   */
  addParent(parent: string) {
    if (!this.wasIncludedBy(parent)) {
      this.includedBy.push(parent);
    }
    if (this.isIncluded === undefined) {
      this.isIncluded = parent;
    }
  }

  /**
   * Removes param from list of including files and resets primary includer (m)
   * @param parent includer
   */
  removeInclude(parent: string) {
    let pos = this.includedBy.indexOf(parent);
    if (pos !== -1) {
      this.includedBy.splice(pos, 1);
    }
    if (this.isIncluded === parent) {
      this.isIncluded = undefined;
    }
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
    if (GenericFile.cache[file] === undefined) {
      GenericFile.cache[file] = null;
      try {
        builder.build(undefined, file, parent);
        if (builder.config.watcher) builder.config.watcher.add(file);
      } catch (e) {
      }
    }
    // file doesn't exist
    if (GenericFile.cache[file] === null) {
      if (include) {
        return "";
      } else {
        throw `Could not open ${file}`;
      }
    }
    // handle _once
    if (once && GenericFile.cache[file].alreadyIncluded()) {
      GenericFile.cache[file].addParent(parent);
      return "";
    } else {
      return GenericFile.cache[file].getContent(parent);
    }
  }

  /**
   * Recursively remove param files that included it (regenerate content)
   * @param filename file path
   */
  static clearIncludes(filename: string) {
    for (let fname in GenericFile.cache) {
      let f = GenericFile.cache[fname];
      if (f && f.wasIncludedBy(filename)) {
        f.removeInclude(filename);
        GenericFile.clearIncludes(fname);
      }
    }
  }

  /**
   * Unwatch loose files and remove cache objects
   */
  static clean() {
    for (let fname in GenericFile.cache) {
      let f = GenericFile.cache[fname];
      if (f && !f.alreadyIncluded() && fname !== builder.config.entry) {
        delete GenericFile.cache[fname];
        if (builder.config.watcher) builder.config.watcher.unwatch(fname);
      }
    }
  }
}

export default GenericFile;