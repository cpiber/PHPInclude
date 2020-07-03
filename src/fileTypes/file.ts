import Factory from './factory';

interface fileObj { path?: string; }; // reduced vinyl

class GenericFile {
  file: fileObj = undefined;
  contents = "";
  includedBy = [];
  isIncluded: undefined|string = undefined;

  /**
   * File wrapper for manipulating content
   * @param {string} parent Includer
   * @param {vinyl} file vinyl file
   */
  constructor(parent: string, file: fileObj) {
    if (parent) this.includedBy.push(parent); // parent is the includer
    this.file = file;
    Factory.cache[file.path] = this;
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
}

export default GenericFile;