import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, extname } from 'path';
import { BuildFile, PhpFile } from './filetypes';
import { error } from './helpers';

class Builder {
  private files: { [key: string]: BuildFile } = {};
  
  constructor(private options: import('minimist').ParsedArgs) {}

  async buildFile(filename: string, contents?: string | Buffer) {
    try {
      if (!contents) contents = await readFile(filename);
      const file = this.constructFileFromName(filename);
      return file.process(filename, contents);
    } catch (e) {
      error(e, `Error while building file \`${filename}\`:`);
      return false;
    }
  }

  async buildEntry(filename: string, outfile: string) {
    if (!(await this.buildFile(filename))) return false;
    let outcontents = '<?php\n';
    for (const fname in this.files) {
      const f = this.files[fname];
      outcontents += f.getContents() + '\n';
    }
    // call to main module
    outcontents += `\n${BuildFile.generateModuleName(filename)}();`;
    await mkdir(dirname(outfile), { recursive: true });
    await writeFile(outfile, outcontents);
    return true;
  }

  constructFileFromName(filename: string) {
    if (extname(filename) === '.php') return new PhpFile(this);
    throw "filetype not supported yet";
  }

  registerFile(file: BuildFile) {
    this.files[file.getFilename()] = file;
  }
};

export default Builder;