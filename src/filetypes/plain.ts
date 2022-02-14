import { BuildFile } from './file';

class PlainFile extends BuildFile {
  async process(filename: string, contents: string | Buffer) {
    contents = contents.toString();
    this.setContent(filename, `return ${this.stringify(contents)};`);
    return true;
  }

  /**
   * Escape string for embedding, single-quotes version
   * @see https://www.npmjs.com/package/stringify-object
   * @see https://github.com/yeoman/stringify-object/pull/72
   * @param input to stringify
   * @returns stringified version
   */
  private stringify(input: string) {
    input = input.replace(/\\/g, '\\\\');
    input = input.replace(/'/g, '\\\'');
    return `'${input}'`;
  }

  public static getName(): string {
    return "plaintext";
  }
}

export { PlainFile };
