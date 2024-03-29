import { ok, strictEqual } from 'assert';
import { stat } from 'fs/promises';
import { resolve } from 'path';
import { debugLog, error, PlainFile } from 'phpinclude/dev';
import { rollup } from 'rollup';
// @ts-ignore
import loadConfigFile from 'rollup/dist/loadConfigFile';

class RollupFile extends PlainFile {
  async process(filename: string, contents: string | Buffer) {
    let opt: import('rollup').MergedRollupOptions = { output: [] };
    for (const pth of ['rollup.config.js', 'rollup.config.mjs', 'rollup.config.cjs']) {
      try {
        await stat(pth);
      } catch (e) {
        debugLog(`Skipped config file \`${pth}\``);
        continue;
      }
      try {
        const { options } = await loadConfigFile(resolve(pth));
        strictEqual(options.length, 1, 'Exactly 1 configuration has to be provided');
        opt = options[0];
      } catch (e) {
        console.warn(`WARNING: Could not load config from file \`${pth}\`:`);
        console.warn((e as any).message || e);
      }
    }
    try {
      opt.input = resolve(filename);
      const { generate } = await rollup(opt);
      ok(opt.output.length <= 1, 'Only 1 output option may be provided');
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