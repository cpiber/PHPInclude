import vinyl from 'vinyl';

import Builder from '../build';
import { env } from '../global';

class GenericFile {
  builder: Builder = undefined;
  file: vinyl = undefined;
  contents = "";
  includedBy: string[] = [];
  isIncluded: string = undefined;
  dirty = true;
  isWatching = false;
  persistent = false;

  /**
   * File wrapper for manipulating content
   * @param {string} parent includer
   * @param {vinyl} file vinyl file
   */
  constructor(builder: Builder, parent: string, file: vinyl) {
    this.builder = builder;
    if (parent) this.addParent(parent); // parent is the includer
    this.file = file;
  }

  /**
   * Set content
   * Might trigger processing depending on file (see subclasses)
   * @param {string} content file content
   * @returns {string} content
   */
  async setContent(content: string): Promise<string> {
    this.contents = content;
    this.dirty = false;
    return Promise.resolve(this.contents);
  }

  /**
   * Get content and set parent as including file
   * @param {string} parent includer
   * @returns {string} content
   */
  getContent(parent: string): string {
    this.addParent(parent);
    return this.genContent(this.contents);
  }

  /**
   * Generate content
   * Adds surrounding comments in dev mode
   * @param {string} content
   * @returns {string} content
   */
  genContent(content: string = ""): string {
    if (env === 'production') return content;
    return `// BEGIN ${this.file.path}\n${content}\n// END ${this.file.path}`;
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
   * Watch file
   * For most files default watcher
   */
  watch() {
    if (!this.isWatching) {
      this.builder.watcher.add(this.file.path);
      this.isWatching = true;
    }
  }

  /**
   * Unwatch file
   * For most files default watcher
   */
  unwatch() {
    if (this.isWatching) {
      this.builder.watcher.unwatch(this.file.path);
      this.isWatching = false;
    }
  }

  /**
   * Register loader names
   */
  static registerLoader(): string[] {
    return null;
  }

  /**
   * Register extensions
   */
  static registerExt(): string[] {
    return null;
  }
}

export default GenericFile;