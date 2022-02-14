import { notStrictEqual } from 'assert';
import { createHash } from 'crypto';
import { basename, extname } from 'path';
import type Builder from '..';
import { isDev } from '../helpers';

interface Inc {
  what: string;
  require: boolean;
}

abstract class BuildFile {
  private filename?: string;
  private contents?: string;
  private includedBy: Set<string> = new Set();
  private includes: Set<string> = new Set();

  constructor(protected builder: Builder) {}
  abstract process(filename: string, contents: string | Buffer): Promise<boolean>;
  public getFilename(): string { notStrictEqual(this.filename, undefined); return this.filename!; }
  public getContents(): string { notStrictEqual(this.contents, undefined); return this.contents!; }
  public isPresent(): boolean { return !!this.includedBy.size; }
  public static getName(): string { throw new Error('loader did not define name'); }

  protected setContent(filename: string, contents: string) {
    this.filename = filename;
    this.contents = BuildFile.generateModule(filename, contents);
    this.includes.clear();
    this.builder.registerFile(this);
  }
  protected async includeFiles(incpaths: Array<Inc>) {
    for (const inc of incpaths) {
      if (!(await this.builder.buildFileIfNotCached(inc.what, inc.require)))
        return false;
    }
    for (const inc of incpaths) {
      const f = this.builder.fileByName(inc.what);
      if (f) {
        this.includes.add(inc.what);
        f.includedBy.add(this.getFilename());
      }
    }
    return true;
  }

  public registerIncludes() {
    this.includes.forEach(inc => {
      this.builder.fileByName(inc).includedBy.add(this.getFilename());
    });
    return true;
  }
  public removeAbandoned() {
    this.includes.forEach(inc => {
      const f = this.builder.fileByName(inc);
      f.includedBy.delete(this.getFilename());
      if (!f.includedBy.size) f.removeAbandoned();
    });
  }
  public putEntry() {
    this.includedBy.add('__entry__');
  }

  static generateModuleName(filename: string) {
    const base = `__module__${createHash('md5').update(filename).digest('hex')}`;
    return isDev() ? base + `_${basename(filename, extname(filename))}` : base;
  }
  static generateModule(filename: string, contents: string) {
    if (isDev()) contents = `// Generated from ${filename}\n${contents}`;
    return `function ${this.generateModuleName(filename)}() {
${contents}
return 1;
}`;
  }
  static generateModuleCall(filename: string, require = true, once = false, withSemi = true) {
    const call = `__helpers_call(${JSON.stringify(filename)}, ${require}, ${once})`;
    return withSemi ? call + ';' : call;
  }
  static generateModuleHelpers() {
    return `
$__helpers_module_dict = array();
function __helpers_tomodule($module) {
  return "__module__" . md5($module)${isDev() ? ' . "_" . pathinfo($module, PATHINFO_FILENAME)' : ""};
}
function __helpers_call($module, $require, $once) {
  global $__helpers_module_dict;
  $mod = __helpers_tomodule($module);
  if ($once && array_key_exists($mod, $__helpers_module_dict)) return 1;
  $__helpers_module_dict[$mod] = true;
  if (function_exists($mod)) return call_user_func($mod);
  else if ($require) die("Module $module does not exist, this should not happen");
  else echo "Warning: Module $module does not exist in " . __FILE__ . " on line " . __LINE__ . "\\n";
  return false;
}`;
  }
}

export { BuildFile, Inc };
