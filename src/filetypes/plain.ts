import { BuildFile } from './file';

class PlainFile extends BuildFile {
  async process(filename: string, contents: string | Buffer) {
    contents = contents.toString();
    this.setContent(filename, `return ${JSON.stringify(contents)};`);
    return true;
  }
}

export { PlainFile };
