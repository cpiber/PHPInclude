import { ok, strictEqual } from 'assert';
import { resolve } from 'path';
import { error, PlainFile } from 'phpinclude/dev';
import { rollup } from 'rollup';
// @ts-ignore
import loadConfigFile from 'rollup/dist/loadConfigFile';

class RollupFile extends PlainFile {
  async process(filename: string, contents: string | Buffer) {
    let opt: import('rollup').MergedRollupOptions = { output: [] };
    try {
      const { options } = await loadConfigFile('rollup.config.js');
      strictEqual(options.length, 1, 'Exactly 1 configuration has to be provided');
      opt = options[0];
    } catch (e) {
      console.warn('WARNING: Could not load config from file:');
      console.warn((e as any).message || e);
    }
    try {
      opt.input = resolve(filename);
      const { generate } = await rollup(opt);
      ok(opt.output.length <= 1, 'Only 1 output may be provided');
      const { output } = await generate(opt.output[0] || {});
      strictEqual(output.length, 1);
      this.setContent(filename, `return ${this.stringify(output[0].code)};`);
    } catch (e) {
      error(e, 'Error building with rollup:');
      return false;
    }
    return true;
  }

  public static getName(): string {
    return "rollup";
  }
}
export default RollupFile;