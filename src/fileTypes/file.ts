const path = require('path');
import builder from '../build';

interface fileObj { path?: string; };

class GenericFile {
  file: fileObj = {};
  contents = "";
  includedBy = [];
  isIncluded: undefined|string = undefined;

  static cache: { [key: string]: GenericFile } = {};

  constructor(parent: string, file: fileObj) {
    if (parent) this.includedBy.push(parent);
    this.file = file;
    GenericFile.cache[file.path] = this;
  }

  setContent(content: string) {
    this.contents = content;
    return this.contents;
  }

  getContent(parent: string) {
    this.addParent(parent);
    return this.contents;
  }

  wasIncludedBy(parent: string) {
    return this.includedBy.indexOf(parent) !== -1;
  }

  alreadyIncluded() {
    return this.isIncluded !== undefined;
  }

  addParent(parent: string) {
    if (!this.wasIncludedBy(parent)) {
      this.includedBy.push(parent);
    }
    if (this.isIncluded === undefined) {
      this.isIncluded = parent;
    }
  }

  removeInclude(parent: string) {
    let pos: number;
    if ((pos = this.includedBy.indexOf(parent)) !== -1) {
      this.includedBy.splice(pos, 1);
    }
    if (this.isIncluded === parent) {
      this.isIncluded = undefined;
    }
  }

  static fillContent(parent: string, filename: string,
    include: boolean, once: boolean): string {

    let file = path.join(path.dirname(parent), filename);
    if (GenericFile.cache[file] === undefined) {
      GenericFile.cache[file] = null;
      try {
        builder.build(undefined, file, parent);
        if (builder.config.watcher) builder.config.watcher.add(file);
      } catch (e) {
      }
    }
    if (GenericFile.cache[file] === null) {
      if (include) {
        return "";
      } else {
        throw "Could not open " + file;
      }
    }
    if (once && GenericFile.cache[file].alreadyIncluded()) {
      GenericFile.cache[file].addParent(parent);
      return "";
    } else {
      return GenericFile.cache[file].getContent(parent);
    }
  }

  static clearIncludes(filename: string) {
    for (let fname in GenericFile.cache) {
      let f = GenericFile.cache[fname];
      if (f && f.wasIncludedBy(filename)) {
        f.removeInclude(filename);
        GenericFile.clearIncludes(fname);
      }
    }
  }

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