import { notStrictEqual } from 'assert';
import { createHash } from 'crypto';
import { basename, extname } from 'path';
import type Builder from '..';
import { isDev } from '../helpers';

abstract class BuildFile {
  private filename?: string;
  private contents?: string;
  constructor(protected builder: Builder) {}
  abstract process(filename: string, contents: string | Buffer): boolean;
  public getFilename(): string { notStrictEqual(this.filename, undefined); return this.filename!; }
  public getContents(): string { notStrictEqual(this.contents, undefined); return this.contents!; }

  protected setContent(filename: string, contents: string) {
    this.filename = filename;
    this.contents = BuildFile.generateModule(filename, contents);
    this.builder.registerFile(this);
  }

  static generateModuleName(filename: string) {
    const base = `__module_${createHash('md5').update(filename).digest('hex')}`;
    return isDev() ? base + `__${basename(filename, extname(filename))}` : base;
  }
  static generateModule(filename: string, contents: string) {
    if (isDev()) contents = `// Generated from ${filename}\n${contents}`;
    return `function ${this.generateModuleName(filename)}() {
${contents}
}`;
  }
}

export { BuildFile };
