import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, extname } from 'path';
import { BuildFile, PhpFile, PlainFile } from './filetypes';
import { error } from './helpers';

type Sub = (new (b: Builder) => BuildFile) & { [k in keyof typeof BuildFile]: typeof BuildFile[k] };
class Builder {
  private files: { [key: string]: BuildFile } = {};
  private extmappings: { [key: string]: Sub } = {
    '.php': PhpFile,
    '.txt': PlainFile,
    '.js':  PlainFile,
  };
  
  constructor(private options: import('minimist').ParsedArgs) {}

  async buildFile(filename: string, contents?: string | Buffer, required = false) {
    try {
      if (!contents) contents = await readFile(filename);
    } catch (e) {
      if (required) {
        error(e, `Error while building file \`${filename}\`:`);
        return false;
      } else {
        return true;
      }
    }
    
    const file = this.constructFileFromName(filename);
    return file.process(filename, contents);
  }

  async buildFileIfNotCached(filename: string, required = false) {
    if (filename in this.files) return true;
    return this.buildFile(filename, undefined, required);
  }

  async buildEntry(entry: string, outfile: string) {
    if (!(await this.buildFile(entry))) return false;
    return this.rebuildWithEntry(entry, outfile);
  }

  async rebuildWithEntry(entry: string, outfile: string) {
    let outcontents = `<?php\n${BuildFile.generateModuleHelpers()}\n\n`;
    for (const fname in this.files) {
      const f = this.files[fname];
      outcontents += f.getContents() + '\n';
    }
    // call to main module
    outcontents += `\n${BuildFile.generateModuleCall(entry)}`;
    await mkdir(dirname(outfile), { recursive: true });
    await writeFile(outfile, outcontents);
    return true;
  }

  constructFileFromName(filename: string) {
    const ext = extname(filename);
    if (ext in this.extmappings) return new this.extmappings[ext](this);
    throw "filetype not supported (yet)";
  }

  registerFile(file: BuildFile) {
    this.files[file.getFilename()] = file;
  }
};

export default Builder;