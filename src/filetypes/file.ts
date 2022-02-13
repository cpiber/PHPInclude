import { notStrictEqual } from 'assert';
import { createHash } from 'crypto';
import { basename, extname } from 'path';
import type Builder from '..';
import { isDev } from '../helpers';

abstract class BuildFile {
  private filename?: string;
  private contents?: string;
  constructor(protected builder: Builder) {}
  abstract process(filename: string, contents: string | Buffer): Promise<boolean>;
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
  static generateModuleCall(filename: string, require = true, once = false, withSemi = true) {
    const call = `__helpers_call(${JSON.stringify(this.generateModuleName(filename))}, ${require}, ${once})`;
    return withSemi ? call + ';' : call;
  }
  static generateModuleHelpers() {
    return `
$__helpers_module_dict = array();
function __helpers_call($module, $require, $once) {
  global $__helpers_module_dict;
  if ($once && array_key_exists($module, $__helpers_module_dict)) return;
  $__helpers_module_dict[$module] = true;
  if (function_exists($module)) return call_user_func($module);
  else if ($require) die("Module $module does not exist, this should not happen");
  else echo "Warning: Module $module does not exist in " . __FILE__ . " on line " . __LINE__ . "\\n";
}`;
  }
}

export { BuildFile };
