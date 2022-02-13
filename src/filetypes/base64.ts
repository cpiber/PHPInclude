import { BuildFile } from './file';

class Base64File extends BuildFile {
  async process(filename: string, contents: string | Buffer) {
    this.setContent(filename, `return base64_decode(${JSON.stringify(contents.toString('base64'))}, true);`);
    return true;
  }
}

export { Base64File };
