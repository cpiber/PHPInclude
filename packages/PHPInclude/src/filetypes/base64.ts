import { BuildFile } from './file';

class Base64File extends BuildFile {
  async process(filename: string, contents: string | Buffer) {
    this.setContent(filename, `return base64_decode(${JSON.stringify(contents.toString('base64'))}, true);`);
    return true;
  }

  public static getName(): string {
    return "base64";
  }
}

export { Base64File };
