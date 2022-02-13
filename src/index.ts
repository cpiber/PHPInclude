import { EventEmitter } from 'events';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, extname } from 'path';
import { Base64File, BuildFile, PhpFile, PlainFile } from './filetypes';
import { error, warn } from './helpers';

type Sub = (new (b: Builder) => BuildFile) & { [k in keyof typeof BuildFile]: typeof BuildFile[k] };
class Builder extends EventEmitter {
  private files: { [key: string]: BuildFile } = {};
  private extmappings: { [key: string]: Sub } = {
    '.php': PhpFile,
    '.txt': PlainFile,
    '.js':  PlainFile,
    '.bin': Base64File,
  };
  
  constructor(private options: import('minimist').ParsedArgs) {
    super();
  }

  async buildFile(filename: string, contents?: string | Buffer, required = true) {
    try {
      if (!contents) contents = await readFile(filename);
    } catch (e) {
      if (required) {
        error(e, `Error reading file \`${filename}\`:`);
        return false;
      } else {
        warn(`Error reading file \`${filename}\`, not included in build`);
        return true;
      }
    }
    
    try {
      const file = this.constructFileFromName(filename);
      const success = await file.process(filename, contents);
      if (success) this.emit('built', filename, file);
      return success;
    } catch (e) {
      error(e, `Error while building file \`${filename}\`:`);
      return false;
    }
  }
  async buildFileIfNotCached(filename: string, required = true) {
    if (filename in this.files) return this.files[filename].registerIncludes();
    return this.buildFile(filename, undefined, required);
  }
  async rebuildFile(filename: string, contents?: string | Buffer, required = true) {
    if (filename in this.files) this.files[filename].removeAbandoned();
    return this.buildFile(filename, contents, required);
  }

  async buildEntry(entry: string, outfile: string) {
    if (!(await this.buildFile(entry))) return false;
    return this.rebuildWithEntry(entry, outfile);
  }
  async rebuildWithEntry(entry: string, outfile: string) {
    this.files[entry].putEntry();
    let outcontents = `<?php\n${BuildFile.generateModuleHelpers()}\n\n`;
    for (const fname in this.files) {
      const f = this.files[fname];
      if (f.isPresent()) outcontents += f.getContents() + '\n';
    }
    // call to main module
    outcontents += `\n${BuildFile.generateModuleCall(entry)}`;
    await mkdir(dirname(outfile), { recursive: true });
    await writeFile(outfile, outcontents);
    this.emit('entry-built');
    return true;
  }

  constructFileFromName(filename: string) {
    if (filename in this.files) return this.files[filename];
    const ext = extname(filename);
    if (ext in this.extmappings) return new this.extmappings[ext](this);
    throw "filetype not supported (yet)";
  }

  registerFile(file: BuildFile) {
    this.files[file.getFilename()] = file;
    this.emit('file-added', file.getFilename(), file);
  }
  fileByName(filename: string) {
    return this.files[filename];
  }
};

export default Builder;