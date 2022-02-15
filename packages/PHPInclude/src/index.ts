import { EventEmitter } from 'events';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, extname } from 'path';
import { Config, loadConfig, verifyConfig } from './config';
import { Base64File, BuildFile, BuildFileSubclass, PhpFile, PlainFile } from './filetypes';
import { error, warn } from './helpers';

class Builder extends EventEmitter {
  private files: { [key: string]: BuildFile } = {};
  private loaders: BuildFileSubclass[] = [ PhpFile, PlainFile, Base64File ];
  private extmappings: { [key: string]: BuildFileSubclass } = {
    '.php': PhpFile,
    '.txt': PlainFile,
    '.js':  PlainFile,
    '.bin': Base64File,
  };
  
  constructor(private options: import('minimist').ParsedArgs, private config?: Config) {
    super();
    if (this.options.config) this.config = loadConfig(this.options.config, this.options);
    else if (this.config) verifyConfig(this.config);
    else this.config = {};
    if (this.config.loaders) this.loaders.push.apply(this.loaders, this.config.loaders);
    this.loaders.reverse();
    if (this.config.extensions) {
      Object.getOwnPropertyNames(this.config.extensions).forEach(ext => {
        if (this.config!.extensions![ext] === null) return delete this.extmappings[ext];
        const loader = this.loaders.find(loader => loader.getName() === this.config!.extensions![ext]);
        if (!loader) throw `no loader named \`${this.config!.extensions![ext]}\` known for extension \`${ext}\``;
        this.extmappings[ext] = loader;
      });
    }
  }

  /**
   * Fully process given file
   * @returns success
   */
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
  /**
   * Build a file if it wasn't yet built (@see buildFile)
   * Tracks includes.
   * @returns success
   */
  async buildFileIfNotCached(filename: string, required = true) {
    if (filename in this.files) return this.files[filename].registerIncludes();
    return this.buildFile(filename, undefined, required);
  }
  /**
   * Rebuild a file even if it exists (@see buildFile)
   * Tracks new/abandoned includes.
   * @returns success
   */
  async rebuildFile(filename: string, contents?: string | Buffer, required = true) {
    if (filename in this.files) this.files[filename].removeAbandoned();
    return this.buildFile(filename, contents, required);
  }

  /**
   * Full build
   * @returns success
   */
  async buildEntry(entry: string, outfile: string) {
    if (!(await this.buildFile(entry))) return false;
    return this.rebuildWithEntry(entry, outfile);
  }
  /**
   * Generate output file for given entry
   * @returns success
   */
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

  /**
   * Construct BuildFile via extension, or from cache if file is known
   * @private
   */
  constructFileFromName(filename: string) {
    if (filename in this.files) return this.files[filename];
    const ext = extname(filename);
    if (ext in this.extmappings) return new this.extmappings[ext](this);
    throw "filetype not supported (yet)";
  }

  /**
   * Put a file into cache
   * @private
   */
  registerFile(file: BuildFile) {
    this.files[file.getFilename()] = file;
    this.emit('file-added', file.getFilename(), file);
  }
  /**
   * Retrieve a file from cache
   * @private
   */
  fileByName(filename: string) {
    return this.files[filename];
  }
};

export default Builder;